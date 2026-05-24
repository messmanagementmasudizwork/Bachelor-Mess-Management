import type { UUID } from "./index";

export interface PlatformStats {
  totalMesses: number;
  activeMesses: number;
  suspendedMesses: number;
  totalUsers: number;
  bannedUsers: number;
  newUsersThisMonth: number;
  newMessesThisMonth: number;
  totalActiveMembers: number;
}

export interface MessOverview {
  id: UUID;
  name: string;
  address: string | null;
  mess_type: string;
  status: string;
  invite_code: string;
  seat_capacity: number | null;
  owner_id: UUID;
  created_at: string;
  current_month: string;
  is_month_closed: boolean;
  member_count?: number;
  owner?: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface UserOverview {
  id: UUID;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  profession: string | null;
  is_super_admin: boolean;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  mess_count?: number;
}

export interface AuditLogEntry {
  id: UUID;
  mess_id: UUID | null;
  user_id: UUID;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name: string; email: string | null } | null;
  mess?: { name: string } | null;
}

export interface PlatformAnnouncement {
  id: UUID;
  title: string;
  body: string;
  target_type: "all" | "mess" | "role";
  target_id: UUID | null;
  target_role: string | null;
  sent_by: UUID;
  sent_at: string;
  is_active: boolean;
  sender?: { full_name: string } | null;
}

export type MessStatusFilter = "all" | "active" | "inactive" | "suspended";
export type UserFilter = "all" | "banned" | "super_admin";

export interface ComplaintSummary {
  id: string;
  mess_id: string;
  submitted_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution_note: string | null;
  media_url: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  mess?: { name: string } | null;
  submitter?: { full_name: string; email: string | null } | null;
}

export type ComplaintStatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed" | "rejected";
export type ComplaintPriorityFilter = "all" | "low" | "medium" | "high" | "urgent";

export interface PlatformSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  max_members: number | null;
  max_messes: number | null;
  features: string[];
  is_active: boolean;
  created_at: string;
}
