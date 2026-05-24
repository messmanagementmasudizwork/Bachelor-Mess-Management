import { z } from "zod";
import type { Translations } from "@/lib/i18n";

type V = Translations["validation"];

export function createExpenseSchema(v: V) {
  return z.object({
    category: z.enum([
      "bazaar",
      "rent",
      "electricity",
      "wifi",
      "gas",
      "maid_salary",
      "maintenance",
      "utilities",
      "other",
    ]),
    amount: z.number().positive(v.amountPositive).max(1000000, v.amountMax),
    title: z.string().min(2, v.titleMin2).max(200),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, v.dateInvalid),
    split_type: z.enum(["equal", "by_meal", "custom"]).optional().default("equal"),
    is_variable: z.boolean().optional().default(false),
    receipt_url: z.string().optional(),
  });
}

export function createBazaarSchema(v: V) {
  return z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, v.dateInvalid),
    amount: z.number().positive(v.amountPositive).max(100000, v.amountMax),
    note: z.string().max(500).optional(),
    shop_name: z.string().max(100).optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, v.itemNameRequired),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          unit_price: z.number().positive(),
          total_price: z.number().positive(),
        })
      )
      .optional(),
    receipt_url: z.string().optional(),
  });
}

export type CreateExpenseInput = z.infer<ReturnType<typeof createExpenseSchema>>;
export type CreateBazaarInput = z.infer<ReturnType<typeof createBazaarSchema>>;
