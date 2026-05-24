import { getRequiredClient } from "@/lib/supabase/client";
import { getT } from "@/lib/i18n/get-t";
import { expenseService } from "./expense.service";
import { mealService } from "./meal.service";
import { depositService } from "./deposit.service";
import { memberService } from "./member.service";
import { messService } from "./mess.service";
import {
  calculateMealRate,
  calculateMemberMealCost,
  calculateFixedExpenseShare,
  calculateGuestMealCharge,
} from "@/lib/utils/financial";

export const reportService = {
  async generateMonthlyReport(messId: string, month: string) {
    const [mess, members, expenseSummary, deposits, allMeals] = await Promise.all([
      messService.getMessById(messId),
      memberService.getMessMembers(messId),
      expenseService.getExpenseSummary(messId, month),
      depositService.getMonthlyDeposits(messId, month),
      mealService.getAllMembersMonthlyMeals(messId, month),
    ]);

    const guestMealCharge = mess?.mess_settings?.guest_meal_charge ?? 0;

    // Tally total meals per member + daily breakdown
    const memberMealsMap: Record<string, {
      breakfast: number; lunch: number; dinner: number; guest: number;
      guestBreakfast: number; guestLunch: number; guestDinner: number;
    }> = {};

    const memberDailyMap: Record<
      string,
      Record<string, { b: boolean; l: boolean; d: boolean; g: number }>
    > = {};

    for (const meal of allMeals) {
      const mid = meal.member_id;
      if (!memberMealsMap[mid]) {
        memberMealsMap[mid] = {
          breakfast: 0, lunch: 0, dinner: 0, guest: 0,
          guestBreakfast: 0, guestLunch: 0, guestDinner: 0,
        };
      }
      if (meal.breakfast) memberMealsMap[mid].breakfast++;
      if (meal.lunch) memberMealsMap[mid].lunch++;
      if (meal.dinner) memberMealsMap[mid].dinner++;
      const gb = meal.guest_breakfast ?? 0;
      const gl = meal.guest_lunch ?? 0;
      const gd = meal.guest_dinner ?? 0;
      memberMealsMap[mid].guestBreakfast += gb;
      memberMealsMap[mid].guestLunch += gl;
      memberMealsMap[mid].guestDinner += gd;
      memberMealsMap[mid].guest += gb + gl + gd;

      // daily breakdown
      if (!memberDailyMap[mid]) memberDailyMap[mid] = {};
      const gTotal = gb + gl + gd;
      if (meal.breakfast || meal.lunch || meal.dinner || gTotal > 0) {
        memberDailyMap[mid][meal.date] = {
          b: !!meal.breakfast,
          l: !!meal.lunch,
          d: !!meal.dinner,
          g: gTotal,
        };
      }
    }

    const totalMeals = Object.values(memberMealsMap).reduce(
      (sum, m) => sum + m.breakfast + m.lunch + m.dinner + m.guest,
      0
    );

    const mealRate = calculateMealRate(expenseSummary.total_variable, totalMeals);
    const activeMemberCount = members.filter((m) => m.status === "active").length;
    const fixedSharePerMember = calculateFixedExpenseShare(
      expenseSummary.total_fixed,
      activeMemberCount
    );

    // Tally deposits per member
    const memberDepositsMap: Record<string, number> = {};
    for (const deposit of deposits) {
      const mid = deposit.member_id;
      memberDepositsMap[mid] = (memberDepositsMap[mid] ?? 0) + Number(deposit.amount);
    }

    const memberReports = members.map((member) => {
      const meals = memberMealsMap[member.id] ?? {
        breakfast: 0, lunch: 0, dinner: 0, guest: 0,
        guestBreakfast: 0, guestLunch: 0, guestDinner: 0,
      };
      const totalMemberMeals =
        meals.breakfast + meals.lunch + meals.dinner + meals.guest;
      const mealCost = calculateMemberMealCost(totalMemberMeals, mealRate);
      const guestCharge = calculateGuestMealCharge(
        meals.guestBreakfast,
        meals.guestLunch,
        meals.guestDinner,
        guestMealCharge
      );
      const totalCost = mealCost + fixedSharePerMember + guestCharge;
      const deposited = memberDepositsMap[member.id] ?? 0;
      const balance = deposited - totalCost;

      return {
        member_id: member.id,
        member_name: (member.user as { full_name?: string } | null)?.full_name ?? getT().gamificationExt.unknownMember,
        avatar_url: (member.user as { avatar_url?: string } | null)?.avatar_url ?? null,
        meal_summary: {
          total_breakfast: meals.breakfast,
          total_lunch: meals.lunch,
          total_dinner: meals.dinner,
          total_guest_meals: meals.guest,
          total_meals: totalMemberMeals,
          meal_cost: mealCost,
        },
        meal_cost: mealCost,
        fixed_cost_share: fixedSharePerMember,
        guest_charge: guestCharge,
        total_cost: totalCost,
        deposited,
        balance,
        status: (balance > 0 ? "advance" : balance < 0 ? "due" : "clear") as
          "advance" | "due" | "clear",
        daily_meals: memberDailyMap[member.id] ?? {},
      };
    });

    const totalDeposited = Object.values(memberDepositsMap).reduce(
      (s, v) => s + v,
      0
    );

    const managerMember = members.find((m) => m.role === "manager");
    const managerName =
      (managerMember?.user as { full_name?: string } | null)?.full_name ?? "N/A";

    return {
      mess_id: messId,
      mess_name: mess.name,
      manager_name: managerName,
      month,
      is_closed: mess.is_month_closed ?? false,
      meal_rate: mealRate,
      total_meals: totalMeals,
      total_variable_expense: expenseSummary.total_variable,
      total_fixed_expense: expenseSummary.total_fixed,
      total_expense: expenseSummary.total,
      total_deposited: totalDeposited,
      members: memberReports,
      expense_summary: expenseSummary,
    };
  },

  // ── Snapshot functions ───────────────────────────────────────

  async saveMySnapshot(messId: string, memberId: string, month: string) {
    const report = await this.generateMonthlyReport(messId, month);
    const myData = report.members.find((m) => m.member_id === memberId);
    if (!myData) throw new Error("Member not found in report");

    const myMealData = myData.meal_summary;
    const supabase = getRequiredClient();

    const snapshot = {
      mess_id: messId,
      member_id: memberId,
      month,
      total_meals: myMealData.total_meals,
      total_breakfast: myMealData.total_breakfast,
      total_lunch: myMealData.total_lunch,
      total_dinner: myMealData.total_dinner,
      total_guest_meals: myMealData.total_guest_meals,
      meal_rate: report.meal_rate,
      meal_cost: myData.meal_cost,
      fixed_share: myData.fixed_cost_share,
      guest_charges: myData.guest_charge,
      total_cost: myData.total_cost,
      total_deposited: myData.deposited,
      balance: myData.balance,
      status: myData.status,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("member_monthly_snapshots")
      .upsert(snapshot, { onConflict: "mess_id,member_id,month" });

    if (error) throw new Error(error.message);
    return snapshot;
  },

  async getMySnapshots(messId: string, memberId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("member_monthly_snapshots")
      .select("*")
      .eq("mess_id", messId)
      .eq("member_id", memberId)
      .order("month", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getMySnapshot(messId: string, memberId: string, month: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("member_monthly_snapshots")
      .select("*")
      .eq("mess_id", messId)
      .eq("member_id", memberId)
      .eq("month", month)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async closeMonth(messId: string, month: string, userId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase.rpc("close_month", {
      p_mess_id: messId,
      p_month: month,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
  },

  async autoRotateManager(messId: string): Promise<boolean> {
    try {
      const [mess, history, members] = await Promise.all([
        messService.getMessById(messId),
        memberService.getManagerHistory(messId),
        memberService.getMessMembers(messId),
      ]);

      if (!mess?.mess_settings?.auto_manager_rotation) return false;
      if (mess?.mess_settings?.manager_rotation_type !== "monthly") return false;

      const today = new Date().toISOString().split("T")[0];
      const currentManager = history.find((h) => h.is_current);
      const currentManagerMemberId = (currentManager?.member as { id?: string } | null)?.id;

      const eligibleMembers = members.filter(
        (m) => m.role !== "owner" && m.status === "active"
      );

      if (eligibleMembers.length === 0) return false;

      const currentIdx = eligibleMembers.findIndex((m) => m.id === currentManagerMemberId);
      const rotationQueue = [
        ...eligibleMembers.slice(currentIdx + 1),
        ...eligibleMembers.slice(0, currentIdx + 1),
      ];

      const isOnLeave = (m: typeof eligibleMembers[0]) => {
        const ls = (m as { leave_start?: string | null }).leave_start;
        const le = (m as { leave_end?: string | null }).leave_end;
        if (!ls) return false;
        return today >= ls && (!le || today <= le);
      };

      const nextMember = rotationQueue.find(
        (m) => m.id !== currentManagerMemberId && !isOnLeave(m)
      );

      if (!nextMember) return false;

      await memberService.assignManager(messId, nextMember.id, getT().gamificationExt.autoRotationNote);
      return true;
    } catch {
      return false;
    }
  },
};
