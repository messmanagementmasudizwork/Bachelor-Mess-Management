import type { UUID, AuditFields } from "./index";

export type MemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "assistant_manager"
  | "member"
  | "guest";

export type MemberStatus = "active" | "inactive" | "on_leave" | "removed";
export type AccountStatus = "active" | "frozen" | "banned" | "closed";

export interface ReactivationRequest {
  id: string;
  mess_id: string;
  member_id: string;
  proof_text: string | null;
  proof_file_url: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  member?: MessMember;
}

export interface MessMember extends AuditFields {
  id: UUID;
  mess_id: UUID;
  user_id: UUID;
  role: MemberRole;
  status: MemberStatus;
  seat_number: number | null;
  joining_date: string;
  leave_start?: string | null;
  leave_end?: string | null;
  meal_default_breakfast: boolean;
  meal_default_lunch: boolean;
  meal_default_dinner: boolean;

  // Leave violation & account status
  account_status: AccountStatus;
  open_leave_started: string | null;
  leave_violation_since: string | null;

  // Joined user data
  user?: UserProfile;
}

export interface UserProfile {
  id: UUID;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  profession: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
  preferred_language: "bn" | "en";
  created_at?: string;
}

export interface MemberWithBalance extends MessMember {
  total_deposits: number;
  total_meal_cost: number;
  total_expense_share: number;
  balance: number;
  due_amount: number;
  total_meals: number;
}

export interface MemberPermission {
  id: UUID;
  user_id: UUID;
  mess_id: UUID;
  permission_key: string;
  allowed: boolean;
}

export interface RolePermissionPreset {
  role: MemberRole;
  permission_key: Permission;
  allowed: boolean;
  created_at: string;
}

export interface MessRolePermission {
  id: UUID;
  mess_id: UUID;
  role: string;
  permission_key: string;
  allowed: boolean;
  updated_by: UUID | null;
  created_at: string;
  updated_at: string;
}

export type Permission =
  | "meals.manage_others"
  | "expenses.create"
  | "expenses.approve"
  | "expenses.delete"
  | "bazaar.create"
  | "bazaar.edit"
  | "bazaar.delete"
  | "bazaar.approve"
  | "members.invite"
  | "members.remove"
  | "members.manage_roles"
  | "deposits.add"
  | "deposits.approve"
  | "reports.view"
  | "reports.export"
  | "settings.manage"
  | "mess.close_month"
  | "inventory.manage"
  | "menu.manage"
  | "notifications.send"
  // ── Navigation visibility (controls sidebar menu items) ──
  | "nav.bazaar"
  | "nav.expenses"
  | "nav.deposits"
  | "nav.members"
  | "nav.reports"
  | "nav.inventory"
  | "nav.kitchen"
  | "nav.menu"
  | "nav.polls"
  | "nav.complaints"
  | "nav.chat"
  | "nav.notices"
  | "nav.gamification";

const ALL_NAV: Permission[] = [
  "nav.bazaar", "nav.expenses", "nav.deposits", "nav.members",
  "nav.reports", "nav.inventory", "nav.kitchen", "nav.menu",
  "nav.polls", "nav.complaints", "nav.chat", "nav.notices", "nav.gamification",
];

export const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "meals.manage_others",
    "expenses.create",
    "expenses.approve",
    "expenses.delete",
    "bazaar.create",
    "bazaar.edit",
    "bazaar.delete",
    "bazaar.approve",
    "members.invite",
    "members.remove",
    "members.manage_roles",
    "deposits.add",
    "deposits.approve",
    "reports.view",
    "reports.export",
    "settings.manage",
    "mess.close_month",
    "inventory.manage",
    "menu.manage",
    "notifications.send",
    ...ALL_NAV,
  ],
  admin: [
    "meals.manage_others",
    "expenses.create",
    "expenses.approve",
    "expenses.delete",
    "bazaar.create",
    "bazaar.approve",
    "members.invite",
    "members.remove",
    "members.manage_roles",
    "deposits.add",
    "deposits.approve",
    "reports.view",
    "reports.export",
    "settings.manage",
    "mess.close_month",
    "inventory.manage",
    "menu.manage",
    "notifications.send",
    ...ALL_NAV,
  ],
  manager: [
    "meals.manage_others",
    "expenses.create",
    "bazaar.create",
    "members.invite",
    "deposits.add",
    "reports.view",
    "reports.export",
    "inventory.manage",
    "menu.manage",
    "notifications.send",
    ...ALL_NAV,
  ],
  assistant_manager: [
    "bazaar.create",
    "reports.view",
    "menu.manage",
    "nav.bazaar", "nav.expenses", "nav.deposits",
    "nav.reports", "nav.inventory", "nav.kitchen", "nav.menu",
    "nav.polls", "nav.complaints", "nav.chat", "nav.notices", "nav.gamification",
  ],
  member: [
    "reports.view",
    "nav.reports", "nav.kitchen", "nav.menu",
    "nav.polls", "nav.complaints", "nav.chat", "nav.notices", "nav.gamification",
  ],
  guest: [
    "nav.polls", "nav.chat", "nav.notices", "nav.gamification",
  ],
};
