import { getRequiredClient } from "@/lib/supabase/client";
import type { CreateDepositInput } from "@/lib/validations/deposit.schema";

export const depositService = {
  async createDeposit(
    messId: string,
    input: CreateDepositInput,
    userId: string
  ) {
    const supabase = getRequiredClient();
    const month = input.date.substring(0, 7);
    const memberId = input.member_id;

    if (!memberId) {
      throw new Error("No member selected. Please select a member.");
    }

    const { data, error } = await supabase
      .from("deposits")
      .insert({
        mess_id: messId,
        member_id: memberId,
        amount: input.amount,
        payment_method: input.payment_method,
        transaction_ref: input.transaction_ref ?? null,
        note: input.note ?? null,
        date: input.date,
        status: "confirmed",
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
        month,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getMonthlyDeposits(messId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("deposits")
      .select(`
        *,
        member:mess_members(
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .eq("month", month)
      .neq("status", "rejected")
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getMemberDeposits(messId: string, memberId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("mess_id", messId)
      .eq("member_id", memberId)
      .eq("month", month)
      .neq("status", "rejected")
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async confirmDeposit(depositId: string, userId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("deposits")
      .update({
        status: "confirmed",
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositId);
    if (error) throw new Error(error.message);
  },

  async rejectDeposit(depositId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("deposits")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", depositId);
    if (error) throw new Error(error.message);
  },

  async getMemberBalance(messId: string, memberId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase.rpc("get_member_balance", {
      p_member_id: memberId,
      p_mess_id: messId,
      p_month: month,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getAllMemberBalances(messId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("member_balances")
      .select("*")
      .eq("mess_id", messId)
      .eq("month", month);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
