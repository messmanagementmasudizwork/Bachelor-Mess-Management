import type { UUID, AuditFields } from "./index";

export type ExpenseCategory =
  | "bazaar"
  | "rent"
  | "electricity"
  | "wifi"
  | "gas"
  | "maid_salary"
  | "maintenance"
  | "utilities"
  | "other";

export type ExpenseStatus = "pending" | "approved" | "rejected";
export type ExpenseSplitType = "equal" | "by_meal" | "custom";

export interface Expense extends AuditFields {
  id: UUID;
  mess_id: UUID;
  category: ExpenseCategory;
  amount: number;
  title: string;
  note: string | null;
  receipt_url: string | null;
  date: string;
  status: ExpenseStatus;
  split_type: ExpenseSplitType;
  is_variable: boolean;
  approved_by: UUID | null;
  approved_at: string | null;
  month: string; // YYYY-MM

  // Joined data
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface BazaarEntry extends AuditFields {
  id: UUID;
  mess_id: UUID;
  expense_id: UUID;
  date: string;
  amount: number;
  note: string | null;
  shop_name: string | null;
  receipt_url: string | null;
  items: BazaarItem[];
  month: string;

  // Joined data
  created_by_user?: {
    full_name: string;
  };
}

export interface BazaarItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export type CreateExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  title: string;
  note?: string;
  date: string;
  split_type?: ExpenseSplitType;
  is_variable?: boolean;
  receipt_url?: string;
};

export type CreateBazaarInput = {
  date: string;
  amount: number;
  note?: string;
  shop_name?: string;
  items?: BazaarItem[];
  receipt_url?: string;
};

export interface ExpenseSummary {
  month: string;
  total_variable: number;
  total_fixed: number;
  total: number;
  by_category: Record<ExpenseCategory, number>;
}
