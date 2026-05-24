import type { UUID, AuditFields } from "./index";

export type MessType = "student" | "job_holder" | "family" | "hostel";
export type MessStatus = "active" | "inactive" | "suspended";

export interface Mess extends AuditFields {
  id: UUID;
  name: string;
  address: string | null;
  mess_type: MessType;
  status: MessStatus;
  owner_id: UUID;
  invite_code: string;
  seat_capacity: number | null;
  description: string | null;
  avatar_url: string | null;
  settings: MessSettings;
  current_month: string; // YYYY-MM
  is_month_closed: boolean;
}

export interface MessSettings {
  meal_cutoff_breakfast: string; // "HH:mm" — per-meal cutoff time
  meal_cutoff_lunch: string;
  meal_cutoff_dinner: string;
  cutoff_days_before: number;     // 0 = same day, 1 = 1 day before, 2 = 2 days before
  cutoff_time_mode: "single" | "per_meal"; // single = one time for all meals, per_meal = individual
  cutoff_single_time: string;    // "HH:mm" — used when cutoff_time_mode = 'single'
  late_meal_penalty: number;
  guest_meal_charge: number;
  auto_manager_rotation: boolean;
  manager_rotation_type: "weekly" | "monthly" | "manual";
  currency: string;
  timezone: string;
  show_meal_count_to_members: boolean;
  allow_guest_meals: boolean;
  require_expense_approval: boolean;
  min_deposit_amount: number;
  notifications_enabled: boolean;
  weekly_menu_budget: number;
  max_meal_leave_days: number;
  allow_open_leave_presets: boolean;
}

export interface MessSummary {
  id: UUID;
  name: string;
  avatar_url: string | null;
  mess_type: MessType;
  member_count: number;
  current_balance: number;
  current_manager: string | null;
  meal_rate: number;
  total_meals_today: number;
}

export type CreateMessInput = {
  name: string;
  address?: string;
  mess_type: MessType;
  seat_capacity?: number;
  description?: string;
};

export type UpdateMessInput = Partial<CreateMessInput> & {
  settings?: Partial<MessSettings>;
};
