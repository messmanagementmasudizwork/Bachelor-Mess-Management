import { z } from "zod";
import type { Translations } from "@/lib/i18n";

type V = Translations["validation"];

export function createMessSchema(v: V) {
  return z.object({
    name: z.string().min(2, v.messNameMin2).max(100, v.messNameMax),
    address: z.string().max(300, v.addressMax).optional(),
    mess_type: z.enum(["student", "job_holder", "family", "hostel"]),
    seat_capacity: z
      .number()
      .int(v.seatCapacityInt)
      .positive(v.seatCapacityPositive)
      .max(100, v.seatCapacityMax)
      .optional(),
    description: z.string().max(500).optional(),
  });
}

export function createJoinMessSchema(v: V) {
  return z.object({
    invite_code: z
      .string()
      .min(6, v.inviteCodeMin)
      .max(10, v.inviteCodeMax)
      .toUpperCase(),
  });
}

export const updateMessSettingsSchema = z.object({
  meal_cutoff_breakfast: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  meal_cutoff_lunch: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  meal_cutoff_dinner: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  late_meal_penalty: z.number().min(0).max(1000),
  guest_meal_charge: z.number().min(0).max(10000),
  auto_manager_rotation: z.boolean(),
  manager_rotation_type: z.enum(["weekly", "monthly", "manual"]),
  min_deposit_amount: z.number().min(0),
  allow_guest_meals: z.boolean(),
  require_expense_approval: z.boolean(),
  notifications_enabled: z.boolean(),
  max_meal_leave_days: z.number().min(7).max(90),
  allow_open_leave_presets: z.boolean(),
});

export type CreateMessInput = z.infer<ReturnType<typeof createMessSchema>>;
export type JoinMessInput = z.infer<ReturnType<typeof createJoinMessSchema>>;
export type UpdateMessSettingsInput = z.infer<typeof updateMessSettingsSchema>;
