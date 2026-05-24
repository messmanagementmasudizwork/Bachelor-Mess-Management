import { getRequiredClient } from "@/lib/supabase/client";
import type { UpdateMealInput } from "@/lib/types";
import { getMonthRange } from "@/lib/utils/date";

export const mealService = {
  async getMealForDate(messId: string, memberId: string, date: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("mess_id", messId)
      .eq("member_id", memberId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async upsertMeal(
    messId: string,
    memberId: string,
    input: UpdateMealInput,
    userId: string
  ) {
    const supabase = getRequiredClient();
    const existing = await this.getMealForDate(messId, memberId, input.date);

    if (existing) {
      const { error } = await supabase
        .from("meals")
        .update({
          breakfast: input.breakfast,
          lunch: input.lunch,
          dinner: input.dinner,
          guest_breakfast: input.guest_breakfast,
          guest_lunch: input.guest_lunch,
          guest_dinner: input.guest_dinner,
          note: input.note ?? null,
          vacation_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("meals").insert({
        mess_id: messId,
        member_id: memberId,
        date: input.date,
        breakfast: input.breakfast ?? true,
        lunch: input.lunch ?? true,
        dinner: input.dinner ?? true,
        guest_breakfast: input.guest_breakfast ?? 0,
        guest_lunch: input.guest_lunch ?? 0,
        guest_dinner: input.guest_dinner ?? 0,
        note: input.note ?? null,
        vacation_id: null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
    }
  },

  async getMonthlyMeals(messId: string, memberId: string, month: string) {
    const supabase = getRequiredClient();
    const { start, end } = getMonthRange(month);
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("mess_id", messId)
      .eq("member_id", memberId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getAllMembersMonthlyMeals(messId: string, month: string) {
    const supabase = getRequiredClient();
    const { start, end } = getMonthRange(month);
    const today = new Date().toISOString().split("T")[0];
    const effectiveEnd = end < today ? end : today;
    const { data, error } = await supabase
      .from("meals")
      .select(`
        *,
        member:mess_members(
          id, role, seat_number,
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .gte("date", start)
      .lte("date", effectiveEnd)
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getDailyMealSummary(messId: string, date: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("meals")
      .select(`
        breakfast, lunch, dinner,
        guest_breakfast, guest_lunch, guest_dinner,
        member:mess_members(
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .eq("date", date);

    if (error) throw new Error(error.message);

    const meals = data ?? [];
    return {
      date,
      total_breakfast: meals.filter((m) => m.breakfast).length,
      total_lunch: meals.filter((m) => m.lunch).length,
      total_dinner: meals.filter((m) => m.dinner).length,
      total_guest: meals.reduce(
        (sum, m) => sum + (m.guest_breakfast ?? 0) + (m.guest_lunch ?? 0) + (m.guest_dinner ?? 0),
        0
      ),
      members: meals,
    };
  },

  async getAllMembersForDate(messId: string, date: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("meals")
      .select(`
        id, member_id, date, breakfast, lunch, dinner,
        guest_breakfast, guest_lunch, guest_dinner,
        member:mess_members(
          id, role, seat_number,
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .eq("date", date);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async bulkTurnOffMeals(
    messId: string,
    memberIds: string[],
    dates: string[],
    userId: string,
    vacationId?: string
  ): Promise<void> {
    if (memberIds.length === 0 || dates.length === 0) return;
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0]!;
    const futureDates = dates.filter((d) => d >= today);
    if (futureDates.length === 0) return;

    // Fetch existing records to determine ownership
    const { data: existing } = await supabase
      .from("meals")
      .select("member_id, date, breakfast, lunch, dinner, vacation_id, guest_breakfast, guest_lunch, guest_dinner")
      .eq("mess_id", messId)
      .in("member_id", memberIds)
      .in("date", futureDates);

    const existingMap = new Map(
      (existing ?? []).map((r) => [`${r.member_id}:${r.date}`, r])
    );

    const rows = memberIds.flatMap((memberId) =>
      futureDates.map((date) => {
        const ex = existingMap.get(`${memberId}:${date}`);
        // Vacation owns this row only if all 3 meals were ON (or row didn't exist)
        // If any meal was already OFF by user (vacation_id = null), preserve that ownership
        const allWereOn = !ex || (ex.breakfast && ex.lunch && ex.dinner);
        return {
          mess_id: messId,
          member_id: memberId,
          date,
          breakfast: false,
          lunch: false,
          dinner: false,
          vacation_id: vacationId && allWereOn ? vacationId : (ex?.vacation_id ?? null),
          guest_breakfast: ex?.guest_breakfast ?? 0,
          guest_lunch: ex?.guest_lunch ?? 0,
          guest_dinner: ex?.guest_dinner ?? 0,
          created_by: userId,
        };
      })
    );

    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("meals")
        .upsert(chunk, { onConflict: "mess_id,member_id,date" });
      if (error) throw new Error(error.message);
    }
  },

  async bulkRestoreVacationMeals(messId: string, vacationId: string): Promise<void> {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0]!;
    const { error } = await supabase
      .from("meals")
      .update({ breakfast: true, lunch: true, dinner: true, vacation_id: null })
      .eq("mess_id", messId)
      .eq("vacation_id", vacationId)
      .gte("date", today);
    if (error) throw new Error(error.message);
  },

  async getMemberMealSummary(messId: string, memberId: string, month: string) {
    const meals = await this.getMonthlyMeals(messId, memberId, month);
    const totalBreakfast = meals.filter((m) => m.breakfast).length;
    const totalLunch = meals.filter((m) => m.lunch).length;
    const totalDinner = meals.filter((m) => m.dinner).length;
    const totalGuest = meals.reduce(
      (sum, m) => sum + (m.guest_breakfast ?? 0) + (m.guest_lunch ?? 0) + (m.guest_dinner ?? 0),
      0
    );
    return {
      total_breakfast: totalBreakfast,
      total_lunch: totalLunch,
      total_dinner: totalDinner,
      total_guest_meals: totalGuest,
      total_meals: totalBreakfast + totalLunch + totalDinner + totalGuest,
    };
  },
};
