import type { UUID } from "./index";
import type { MemberMealSummary } from "./meal.types";
import type { ExpenseSummary } from "./expense.types";
import type { WalletBalance } from "./deposit.types";

export interface MonthlyReport {
  mess_id: UUID;
  mess_name: string;
  month: string; // YYYY-MM
  is_closed: boolean;
  closed_at: string | null;

  // Financial Summary
  meal_rate: number;
  total_meals: number;
  total_variable_expense: number;
  total_fixed_expense: number;
  total_expense: number;
  total_deposited: number;

  // Members
  members: MemberMonthlyReport[];

  // Expenses
  expense_summary: ExpenseSummary;
}

export interface MemberMonthlyReport {
  member_id: UUID;
  member_name: string;
  avatar_url: string | null;
  meal_summary: MemberMealSummary;
  wallet: WalletBalance;
  meal_cost: number;
  fixed_cost_share: number;
  total_cost: number;
  deposited: number;
  balance: number;
  status: "clear" | "due" | "advance";
}

export interface DashboardStats {
  current_balance: number;
  total_members: number;
  active_members: number;
  todays_meals: number;
  todays_breakfast: number;
  todays_lunch: number;
  todays_dinner: number;
  current_meal_rate: number;
  monthly_expense: number;
  pending_dues: number;
  current_manager: string | null;
  recent_activities: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  avatar_url: string | null;
  timestamp: string;
}
