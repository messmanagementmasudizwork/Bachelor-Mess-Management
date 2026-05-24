import { z } from "zod";

export const updateMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
  guest_breakfast: z.number().int().min(0).max(20).optional(),
  guest_lunch: z.number().int().min(0).max(20).optional(),
  guest_dinner: z.number().int().min(0).max(20).optional(),
  note: z.string().max(200).optional(),
});

export const bulkMealUpdateSchema = z.object({
  member_id: z.string().uuid().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(31),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
});

export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type BulkMealUpdateInput = z.infer<typeof bulkMealUpdateSchema>;
