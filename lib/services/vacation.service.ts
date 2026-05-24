import { getRequiredClient } from "@/lib/supabase/client";
import { notificationService } from "@/lib/services/notification.service";
import { memberService } from "@/lib/services/member.service";
import { mealService } from "@/lib/services/meal.service";
import { getDatesInRange } from "@/lib/utils/date-range";

export interface MessVacation {
  id: string;
  mess_id: string;
  title: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVacationInput {
  title: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export const vacationService = {
  async getVacationById(vacationId: string): Promise<MessVacation | null> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("mess_vacations")
      .select("*")
      .eq("id", vacationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async getVacations(messId: string): Promise<MessVacation[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("mess_vacations")
      .select("*")
      .eq("mess_id", messId)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getActiveVacation(messId: string): Promise<MessVacation | null> {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0]!;

    // First check if there's a currently active vacation
    const { data: active, error: activeErr } = await supabase
      .from("mess_vacations")
      .select("*")
      .eq("mess_id", messId)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeErr) throw new Error(activeErr.message);
    if (active) return active as MessVacation;

    // Otherwise return the nearest upcoming vacation
    const { data: upcoming, error: upcomingErr } = await supabase
      .from("mess_vacations")
      .select("*")
      .eq("mess_id", messId)
      .gt("start_date", today)
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (upcomingErr) throw new Error(upcomingErr.message);
    return upcoming ?? null;
  },

  async createVacation(
    messId: string,
    input: CreateVacationInput,
    userId: string,
    messName: string
  ): Promise<MessVacation> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("mess_vacations")
      .insert({
        mess_id: messId,
        title: input.title,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const vacation = data as MessVacation;

    // Auto turn-off meals — awaited so cache invalidation fires after DB is updated
    await vacationService
      .turnOffMealsForVacation(messId, vacation, userId)
      .catch((err) => console.error("[VacationService] turnOffMealsForVacation failed:", err));

    // Notify all active members (fire-and-forget, log errors)
    vacationService
      .notifyAllMembers(messId, vacation, messName)
      .catch((err) => console.error("[VacationService] notifyAllMembers failed:", err));

    return vacation;
  },

  async deleteVacation(vacation: MessVacation): Promise<void> {
    const supabase = getRequiredClient();

    // Restore meals BEFORE deleting — FK ON DELETE SET NULL would clear vacation_id otherwise
    await mealService.bulkRestoreVacationMeals(vacation.mess_id, vacation.id);

    const { error } = await supabase
      .from("mess_vacations")
      .delete()
      .eq("id", vacation.id);
    if (error) throw new Error(error.message);
  },

  async turnOffMealsForVacation(
    messId: string,
    vacation: MessVacation,
    userId: string
  ): Promise<void> {
    const members = await memberService.getMessMembers(messId);
    const activeMembers = members.filter((m) => m.status === "active");
    if (activeMembers.length === 0) return;

    const memberIds = activeMembers.map((m) => m.id);
    const dates = getDatesInRange(vacation.start_date, vacation.end_date);

    await mealService.bulkTurnOffMeals(messId, memberIds, dates, userId, vacation.id);
  },

  /**
   * Called when a new member joins the mess.
   * Applies all active + upcoming vacations to that member so their
   * meal calendar matches existing members.
   */
  async applyVacationsToNewMember(messId: string, userId: string, messName = ""): Promise<void> {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0]!;

    // Fetch all vacations that haven't ended yet (active + upcoming)
    const { data: vacations, error } = await supabase
      .from("mess_vacations")
      .select("*")
      .eq("mess_id", messId)
      .gte("end_date", today);

    if (error || !vacations || vacations.length === 0) return;

    // Get the new member's mess_members record
    const member = await memberService.getMemberByUserId(messId, userId);
    if (!member) return;

    const notifs: Parameters<typeof notificationService.createBulkNotifications>[0] = [];

    for (const vacation of vacations as MessVacation[]) {
      // Turn off meals
      const dates = getDatesInRange(vacation.start_date, vacation.end_date);
      await mealService.bulkTurnOffMeals(messId, [member.id], dates, userId, vacation.id);

      // Queue vacation notification
      const startFmt = new Date(vacation.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
      const endFmt   = new Date(vacation.end_date).toLocaleDateString("en-GB",   { day: "numeric", month: "long" });
      notifs.push({
        user_id:    userId,
        mess_id:    messId,
        type:       "vacation_announced" as const,
        title:      `🏖️ মেস ছুটি — ${messName}`,
        body:       `${vacation.title}: ${startFmt} — ${endFmt}`,
        action_url: "/dashboard/notice-vacation",
        metadata: {
          vacation_id: vacation.id,
          start_date:  vacation.start_date,
          end_date:    vacation.end_date,
        },
      });
    }

    if (notifs.length > 0) {
      await notificationService.createBulkNotifications(notifs).catch(() => undefined);
    }
  },

  async notifyAllMembers(
    messId: string,
    vacation: MessVacation,
    messName: string
  ): Promise<void> {
    const members = await memberService.getMessMembers(messId);
    const activeMembers = members.filter((m) => m.status === "active");
    if (activeMembers.length === 0) return;

    const startFmt = new Date(vacation.start_date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
    const endFmt = new Date(vacation.end_date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });

    const notifications = activeMembers.map((m) => ({
      user_id: m.user_id,
      mess_id: messId,
      type: "vacation_announced" as const,
      title: `🏖️ মেস ছুটি ঘোষণা — ${messName}`,
      body: `${vacation.title}: ${startFmt} — ${endFmt}`,
      action_url: "/dashboard/mess",
      metadata: {
        vacation_id: vacation.id,
        start_date: vacation.start_date,
        end_date: vacation.end_date,
      },
    }));

    await notificationService.createBulkNotifications(notifications);
  },
};
