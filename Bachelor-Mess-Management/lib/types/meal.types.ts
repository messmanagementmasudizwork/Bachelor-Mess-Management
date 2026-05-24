import type { UUID, AuditFields } from "./index";

export type MealType = "breakfast" | "lunch" | "dinner";
export type MealStatus = "on" | "off";

export interface MealEntry extends AuditFields {
  id: UUID;
  mess_id: UUID;
  member_id: UUID;
  date: string; // YYYY-MM-DD
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  guest_breakfast: number;
  guest_lunch: number;
  guest_dinner: number;
  note: string | null;

  // Joined data
  member?: {
    user: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface MealSummary {
  date: string;
  total_breakfast: number;
  total_lunch: number;
  total_dinner: number;
  total_guest: number;
  total_meals: number;
}

export interface MemberMealSummary {
  member_id: UUID;
  member_name: string;
  total_breakfast: number;
  total_lunch: number;
  total_dinner: number;
  total_guest_meals: number;
  total_meals: number;
  meal_cost: number;
}

export interface MealCalendarDay {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  guest_count: number;
  is_today: boolean;
  is_past: boolean;
}

export type UpdateMealInput = {
  date: string;
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  guest_breakfast?: number;
  guest_lunch?: number;
  guest_dinner?: number;
  note?: string;
};

export interface MealRule {
  id: UUID;
  mess_id: UUID;
  meal_type: MealType;
  cutoff_time: string; // "HH:mm"
  min_notice_hours: number;
  penalty_amount: number;
  is_active: boolean;
}
