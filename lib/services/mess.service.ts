import { getRequiredClient } from "@/lib/supabase/client";
import type { CreateMessInput, UpdateMessInput } from "@/lib/types";
import { generateInviteCode } from "@/lib/utils";
import { getCurrentMonthString } from "@/lib/utils/date";
import { vacationService } from "@/lib/services/vacation.service";
import { adminNoticeService } from "@/lib/services/admin-notice.service";

export const messService = {
  async createMess(input: CreateMessInput, userId: string) {
    const supabase = getRequiredClient();

    // Ensure profile exists — the DB trigger may not have fired yet (timing gap
    // or not deployed). Upsert is safe: ON CONFLICT DO NOTHING via ignoreDuplicates.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "User",
          email: user.email ?? null,
          phone: (user.user_metadata?.phone as string | undefined) ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    }

    const inviteCode = generateInviteCode(8);
    const defaultSettings = {
      meal_cutoff_breakfast: "08:00",
      meal_cutoff_lunch: "10:00",
      meal_cutoff_dinner: "16:00",
      cutoff_days_before: 0,
      cutoff_time_mode: "per_meal" as "single" | "per_meal",
      cutoff_single_time: "22:00",
      late_meal_penalty: 0,
      guest_meal_charge: 0,
      weekly_menu_budget: 0,
      auto_manager_rotation: false,
      manager_rotation_type: "monthly" as "weekly" | "monthly" | "manual",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      show_meal_count_to_members: true,
      allow_guest_meals: true,
      require_expense_approval: false,
      min_deposit_amount: 100,
      notifications_enabled: true,
    };

    const { data: mess, error: messError } = await supabase
      .from("messes")
      .insert({
        name: input.name,
        address: input.address ?? null,
        mess_type: input.mess_type,
        seat_capacity: input.seat_capacity ?? null,
        description: input.description ?? null,
        owner_id: userId,
        invite_code: inviteCode,
        current_month: getCurrentMonthString(),
        created_by: userId,
      })
      .select()
      .single();

    if (messError) throw new Error(messError.message);

    // Add owner as member
    const { error: memberError } = await supabase.from("mess_members").insert({
      mess_id: mess.id,
      user_id: userId,
      role: "owner",
      status: "active",
      joining_date: new Date().toISOString().split("T")[0],
      meal_default_breakfast: true,
      meal_default_lunch: true,
      meal_default_dinner: true,
    });

    if (memberError) throw new Error(memberError.message);

    // Insert into dedicated mess_settings table (typed columns)
    const { error: settingsError } = await supabase
      .from("mess_settings")
      .insert({ mess_id: mess.id, ...defaultSettings });
    if (settingsError) throw new Error(settingsError.message);

    return mess;
  },

  async joinMess(inviteCode: string, userId: string) {
    const supabase = getRequiredClient();
    const { data: messId, error } = await supabase.rpc("join_mess_by_invite", {
      p_invite_code: inviteCode.toUpperCase(),
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);

    // Fetch mess name for notification titles (non-blocking)
    const { data: messRow } = await supabase
      .from("messes")
      .select("name")
      .eq("id", messId)
      .single();
    const messName: string = messRow?.name ?? "";

    // Apply vacations + send vacation notifications (fire-and-forget)
    vacationService
      .applyVacationsToNewMember(messId, userId, messName)
      .catch((err) => console.error("[MessService] applyVacationsToNewMember failed:", err));

    // Send active notice + upcoming meeting notifications (fire-and-forget)
    adminNoticeService
      .notifyNewMemberOfNotices(messId, userId)
      .catch((err) => console.error("[MessService] notifyNewMemberOfNotices failed:", err));

    return messId;
  },

  async getUserMesses(userId: string) {
    const supabase = getRequiredClient();

    // Primary: query via mess_members (RLS-safe path)
    const { data: memberData, error: memberError } = await supabase
      .from("mess_members")
      .select(`
        role, status, joining_date,
        mess:messes(
          id, name, address, mess_type, status, owner_id,
          invite_code, seat_capacity, avatar_url, current_month,
          is_month_closed, created_at,
          mess_settings(*)
        )
      `)
      .eq("user_id", userId)
      .neq("status", "removed")
      .order("created_at", { ascending: false });

    if (!memberError && memberData && memberData.length > 0) return memberData;

    // Fallback: call server-side API that uses admin client (bypasses RLS)
    // This handles the case where user owns a mess but has no mess_members entry
    try {
      const supabaseClient = getRequiredClient();
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/user-messes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.messes && json.messes.length > 0) return json.messes;
        }
      }
    } catch {
      // ignore, return empty
    }

    return [];
  },

  async getMessById(messId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("messes")
      .select("*, mess_settings(*)")
      .eq("id", messId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateMess(messId: string, updates: UpdateMessInput) {
    const supabase = getRequiredClient();

    // Update basic mess info fields on the messes table
    const messFields: {
      updated_at: string;
      name?: string;
      address?: string | null;
      mess_type?: "student" | "job_holder" | "family" | "hostel";
      seat_capacity?: number | null;
      description?: string | null;
    } = { updated_at: new Date().toISOString() };
    if (updates.name       !== undefined) messFields.name          = updates.name;
    if (updates.address    !== undefined) messFields.address       = updates.address ?? null;
    if (updates.mess_type  !== undefined) messFields.mess_type     = updates.mess_type;
    if (updates.seat_capacity !== undefined) messFields.seat_capacity = updates.seat_capacity ?? null;
    if (updates.description   !== undefined) messFields.description   = updates.description ?? null;

    const { error } = await supabase
      .from("messes")
      .update(messFields)
      .eq("id", messId);
    if (error) throw new Error(error.message);

    // Update settings in the dedicated mess_settings table (no JSONB merge needed)
    if (updates.settings !== undefined) {
      const { error: settingsError } = await supabase
        .from("mess_settings")
        .update({ ...updates.settings, updated_at: new Date().toISOString() })
        .eq("mess_id", messId);
      if (settingsError) throw new Error(settingsError.message);
    }
  },

  async regenerateInviteCode(messId: string) {
    const supabase = getRequiredClient();
    const newCode = generateInviteCode(8);
    const { error } = await supabase
      .from("messes")
      .update({ invite_code: newCode, updated_at: new Date().toISOString() })
      .eq("id", messId);
    if (error) throw new Error(error.message);
    return newCode;
  },

  async getDashboardStats(messId: string) {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = getCurrentMonthString();

    const [membersRes, todayMealsRes, expenseRes] = await Promise.all([
      supabase
        .from("mess_members")
        .select("id, role, user:profiles(full_name, avatar_url)")
        .eq("mess_id", messId)
        .eq("status", "active"),

      supabase
        .from("meals")
        .select("breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner")
        .eq("mess_id", messId)
        .eq("date", today),

      supabase
        .from("expenses")
        .select("amount, is_variable")
        .eq("mess_id", messId)
        .eq("month", currentMonth)
        .eq("status", "approved"),
    ]);

    const members = membersRes.data ?? [];
    const todayMeals = todayMealsRes.data ?? [];
    const expenses = expenseRes.data ?? [];

    const totalBreakfast = todayMeals.filter((m) => m.breakfast).length;
    const totalLunch = todayMeals.filter((m) => m.lunch).length;
    const totalDinner = todayMeals.filter((m) => m.dinner).length;

    const totalMonthlyExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const currentManager = members.find((m) => m.role === "manager");

    return {
      total_members: members.length,
      active_members: members.length,
      todays_breakfast: totalBreakfast,
      todays_lunch: totalLunch,
      todays_dinner: totalDinner,
      todays_meals: totalBreakfast + totalLunch + totalDinner,
      monthly_expense: totalMonthlyExpense,
      current_manager: (currentManager?.user as { full_name?: string } | null)?.full_name ?? null,
    };
  },
};
