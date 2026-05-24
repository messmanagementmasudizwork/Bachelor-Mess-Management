import type { UUID, AuditFields } from "./index";

export type NotificationType =
  | "meal_reminder"
  | "due_reminder"
  | "expense_added"
  | "expense_approved"
  | "deposit_confirmed"
  | "manager_changed"
  | "member_joined"
  | "member_removed"
  | "month_closed"
  | "low_balance"
  | "rule_violation"
  | "vacation_announced"
  | "admin_notice"
  | "system";

export interface Notification extends AuditFields {
  id: UUID;
  user_id: UUID;
  mess_id: UUID | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
}
