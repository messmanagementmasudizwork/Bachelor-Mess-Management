import { getRequiredClient } from "@/lib/supabase/client";
import type { CreateExpenseInput, CreateBazaarInput } from "@/lib/validations/expense.schema";
import { getMonthRange } from "@/lib/utils/date";
import { getT } from "@/lib/i18n/get-t";

export const expenseService = {
  async createExpense(
    messId: string,
    input: CreateExpenseInput,
    userId: string
  ) {
    const supabase = getRequiredClient();
    const month = input.date.substring(0, 7);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        mess_id: messId,
        category: input.category,
        amount: input.amount,
        title: input.title,
        note: input.note ?? null,
        date: input.date,
        status: "approved",
        split_type: input.split_type ?? "equal",
        is_variable: input.is_variable ?? false,
        month,
        created_by: userId,
        ...(input.receipt_url ? { receipt_url: input.receipt_url } : {}),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async createBazaar(
    messId: string,
    input: CreateBazaarInput,
    userId: string
  ) {
    const supabase = getRequiredClient();
    const month = input.date.substring(0, 7);

    const { data: expense, error: expError } = await supabase
      .from("expenses")
      .insert({
        mess_id: messId,
        category: "bazaar",
        amount: input.amount,
        title: input.shop_name ?? input.note ?? getT().gamificationExt.bazaarTitle,
        note: input.note ?? null,
        date: input.date,
        status: "approved",
        split_type: "by_meal",
        is_variable: true,
        month,
        created_by: userId,
      })
      .select()
      .single();
    if (expError) throw new Error(expError.message);

    const { data: bazaar, error: bazError } = await supabase
      .from("bazaar_entries")
      .insert({
        mess_id: messId,
        expense_id: expense.id,
        date: input.date,
        amount: input.amount,
        note: input.note ?? null,
        shop_name: input.shop_name ?? null,
        items: input.items ?? null,
        month,
        created_by: userId,
        ...(input.receipt_url ? { receipt_url: input.receipt_url } : {}),
      })
      .select()
      .single();
    if (bazError) throw new Error(bazError.message);

    return { expense, bazaar };
  },

  async getMonthlyExpenses(messId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .eq("month", month)
      .neq("status", "rejected")
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getBazaarEntries(messId: string, month: string) {
    const supabase = getRequiredClient();
    const { start, end } = getMonthRange(month);
    const { data, error } = await supabase
      .from("bazaar_entries")
      .select(`
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async updateBazaar(
    bazaarId: string,
    expenseId: string,
    input: CreateBazaarInput,
    userId: string
  ) {
    const supabase = getRequiredClient();

    const { error: bazError } = await supabase
      .from("bazaar_entries")
      .update({
        date: input.date,
        amount: input.amount,
        note: input.note ?? null,
        shop_name: input.shop_name ?? null,
        items: input.items ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bazaarId);
    if (bazError) throw new Error(bazError.message);

    const title = input.shop_name ?? input.note ?? getT().gamificationExt.bazaarTitle;
    const { error: expError } = await supabase
      .from("expenses")
      .update({
        amount: input.amount,
        title,
        note: input.note ?? null,
        date: input.date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);
    if (expError) throw new Error(expError.message);

    return { bazaarId, expenseId };
  },

  async deleteBazaar(bazaarId: string, expenseId: string) {
    const supabase = getRequiredClient();

    const { error: bazError } = await supabase
      .from("bazaar_entries")
      .delete()
      .eq("id", bazaarId);
    if (bazError) throw new Error(bazError.message);

    const { error: expError } = await supabase
      .from("expenses")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", expenseId);
    if (expError) throw new Error(expError.message);
  },

  async deleteExpense(expenseId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("expenses")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", expenseId);
    if (error) throw new Error(error.message);
  },

  async approveExpense(expenseId: string, userId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("expenses")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);
    if (error) throw new Error(error.message);
  },

  async getExpenseSummary(messId: string, month: string) {
    const expenses = await this.getMonthlyExpenses(messId, month);
    const totalVariable = expenses
      .filter((e) => e.is_variable)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalFixed = expenses
      .filter((e) => !e.is_variable)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const byCategory: Record<string, number> = {};
    for (const expense of expenses) {
      byCategory[expense.category] = (byCategory[expense.category] ?? 0) + Number(expense.amount);
    }

    return {
      month,
      total_variable: totalVariable,
      total_fixed: totalFixed,
      total: totalVariable + totalFixed,
      by_category: byCategory,
    };
  },
};
