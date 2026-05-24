import { getRequiredClient } from "@/lib/supabase/client";
import type { MemberRole, MemberStatus } from "@/lib/types";

export const memberService = {
  async getMessMembers(messId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("mess_members")
      .select(`
        id, mess_id, user_id, role, status, seat_number,
        joining_date, leave_start, leave_end,
        meal_default_breakfast, meal_default_lunch, meal_default_dinner,
        account_status, open_leave_started, leave_violation_since,
        created_at, updated_at,
        user:profiles(
          id, full_name, phone, email, avatar_url,
          profession, blood_group, emergency_contact, preferred_language
        )
      `)
      .eq("mess_id", messId)
      .neq("status", "removed")
      .order("joining_date", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getMemberByUserId(messId: string, userId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("mess_members")
      .select(`
        id, mess_id, user_id, role, status, seat_number,
        joining_date, meal_default_breakfast, meal_default_lunch, meal_default_dinner,
        account_status, open_leave_started, leave_violation_since,
        user:profiles(id, full_name, phone, email, avatar_url, profession, blood_group)
      `)
      .eq("mess_id", messId)
      .eq("user_id", userId)
      .neq("status", "removed")
      .single();

    if (error) return null;
    return data;
  },

  async updateMemberRole(memberId: string, role: MemberRole) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async updateMemberStatus(memberId: string, status: MemberStatus) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async removeMember(memberId: string, _reason?: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async setManagerLeave(memberId: string, leaveStart: string, leaveEnd: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({
        status: "on_leave",
        leave_start: leaveStart,
        leave_end: leaveEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async updateSeatNumber(memberId: string, seatNumber: number | null) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({ seat_number: seatNumber, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async updateMealDefaults(
    memberId: string,
    defaults: { meal_default_breakfast?: boolean; meal_default_lunch?: boolean; meal_default_dinner?: boolean }
  ) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({ ...defaults, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async getManagerHistory(messId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("manager_history")
      .select(`
        id, mess_id, member_id, start_date, end_date, is_current, handover_note, created_at,
        member:mess_members(
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .order("start_date", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async assignManager(messId: string, memberId: string, note?: string) {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("manager_history")
      .update({ is_current: false, end_date: today })
      .eq("mess_id", messId)
      .eq("is_current", true);

    await supabase
      .from("mess_members")
      .update({ role: "member", updated_at: new Date().toISOString() })
      .eq("mess_id", messId)
      .eq("role", "manager");

    await supabase
      .from("mess_members")
      .update({ role: "manager", updated_at: new Date().toISOString() })
      .eq("id", memberId);

    const { error } = await supabase.from("manager_history").insert({
      mess_id: messId,
      member_id: memberId,
      start_date: today,
      is_current: true,
      handover_note: note ?? null,
    });

    if (error) throw new Error(error.message);
  },
};
