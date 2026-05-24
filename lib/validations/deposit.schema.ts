import { z } from "zod";
import type { Translations } from "@/lib/i18n";

type V = Translations["validation"];

export function createDepositSchema(v: V, minAmount = 0) {
  const minMsg = v.amountMin.replace("{min}", String(minAmount));
  return z.object({
    member_id: z.string().uuid().optional(),
    amount: z.number()
      .positive(v.amountPositive)
      .min(minAmount > 0 ? minAmount : 1, minAmount > 0 ? minMsg : v.amountPositive)
      .max(100000, v.amountMax),
    payment_method: z.enum([
      "cash",
      "bkash",
      "nagad",
      "rocket",
      "bank_transfer",
      "other",
    ]),
    transaction_ref: z.string().max(100).optional(),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, v.dateInvalid),
  });
}

export type CreateDepositInput = z.infer<ReturnType<typeof createDepositSchema>>;
