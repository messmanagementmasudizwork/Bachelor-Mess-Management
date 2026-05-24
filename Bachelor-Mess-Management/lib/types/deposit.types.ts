import type { UUID, AuditFields } from "./index";

export type PaymentMethod =
  | "cash"
  | "bkash"
  | "nagad"
  | "rocket"
  | "bank_transfer"
  | "other";

export type DepositStatus = "pending" | "confirmed" | "rejected";

export interface Deposit extends AuditFields {
  id: UUID;
  mess_id: UUID;
  member_id: UUID;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  note: string | null;
  date: string;
  status: DepositStatus;
  confirmed_by: UUID | null;
  confirmed_at: string | null;
  month: string;

  // Joined data
  member?: {
    user: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface WalletBalance {
  member_id: UUID;
  mess_id: UUID;
  total_deposited: number;
  total_cost: number;
  balance: number;
  due_amount: number;
  advance_amount: number;
  carry_forward: number;
}

export type CreateDepositInput = {
  member_id?: UUID;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  note?: string;
  date: string;
};
