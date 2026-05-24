/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import type {
  PlatformStats,
  MessOverview,
  UserOverview,
  AuditLogEntry,
  PlatformAnnouncement,
  MessStatusFilter,
  UserFilter,
} from "@/lib/types/super-admin.types";

function getDb() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase as any;
}

export const superAdminService = {
  // ============================================================
  // Auth check
  // ============================================================
  async isSuperAdmin(userId: string): Promise<boolean> {
    const { data } = await getDb()
      .from("profiles")
      .select("is_super_admin")
      .eq("id", userId)
      .single();
    return data?.is_super_admin === true;
  },

  // ============================================================
  // Platform Stats
  // ============================================================
  async getPlatformStats(): Promise<PlatformStats> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const monthStr = thisMonthStart.toISOString();

    const [
      { count: totalMesses },
      { count: activeMesses },
      { count: suspendedMesses },
      { count: totalUsers },
      { count: bannedUsers },
      { count: newUsers },
      { count: newMesses },
      { count: activeMembers },
    ] = await Promise.all([
      getDb().from("messes").select("*", { count: "exact", head: true }),
      getDb().from("messes").select("*", { count: "exact", head: true }).eq("status", "active"),
      getDb().from("messes").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      getDb().from("profiles").select("*", { count: "exact", head: true }),
      getDb().from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
      getDb().from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStr),
      getDb().from("messes").select("*", { count: "exact", head: true }).gte("created_at", monthStr),
      getDb().from("mess_members").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

    return {
      totalMesses:       totalMesses   ?? 0,
      activeMesses:      activeMesses  ?? 0,
      suspendedMesses:   suspendedMesses ?? 0,
      totalUsers:        totalUsers    ?? 0,
      bannedUsers:       bannedUsers   ?? 0,
      newUsersThisMonth: newUsers      ?? 0,
      newMessesThisMonth: newMesses    ?? 0,
      totalActiveMembers: activeMembers ?? 0,
    };
  },

  // ============================================================
  // Mess Management
  // ============================================================
  async getAllMesses(
    filter: MessStatusFilter = "all",
    search = "",
    limit = 50,
    offset = 0
  ): Promise<{ data: MessOverview[]; count: number }> {
    let query = getDb()
      .from("messes")
      .select(
        `id, name, address, mess_type, status, invite_code, seat_capacity, owner_id,
         created_at, current_month, is_month_closed,
         owner:profiles!owner_id(full_name, email, phone)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter !== "all") query = query.eq("status", filter);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as MessOverview[], count: count ?? 0 };
  },

  async updateMessStatus(
    messId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<void> {
    const { error } = await getDb()
      .from("messes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", messId);
    if (error) throw new Error(error.message);
  },

  async deleteMess(messId: string): Promise<void> {
    const { error } = await getDb().from("messes").delete().eq("id", messId);
    if (error) throw new Error(error.message);
  },

  async getMessMemberCount(messId: string): Promise<number> {
    const { count } = await getDb()
      .from("mess_members")
      .select("*", { count: "exact", head: true })
      .eq("mess_id", messId)
      .eq("status", "active");
    return count ?? 0;
  },

  // ============================================================
  // User Management
  // ============================================================
  async getAllUsers(
    filter: UserFilter = "all",
    search = "",
    limit = 50,
    offset = 0
  ): Promise<{ data: UserOverview[]; count: number }> {
    let query = getDb()
      .from("profiles")
      .select(
        `id, full_name, email, phone, avatar_url, profession,
         is_super_admin, is_banned, banned_at, banned_reason, created_at`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter === "banned") query = query.eq("is_banned", true);
    if (filter === "super_admin") query = query.eq("is_super_admin", true);
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as UserOverview[], count: count ?? 0 };
  },

  async banUser(userId: string, reason: string): Promise<void> {
    const { error } = await getDb()
      .from("profiles")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },

  async unbanUser(userId: string): Promise<void> {
    const { error } = await getDb()
      .from("profiles")
      .update({ is_banned: false, banned_at: null, banned_reason: null })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },

  async getUserMessCount(userId: string): Promise<number> {
    const { count } = await getDb()
      .from("mess_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "removed");
    return count ?? 0;
  },

  // ============================================================
  // Audit Logs
  // ============================================================
  async getAuditLogs(
    filters: { messId?: string; userId?: string; action?: string; from?: string; to?: string },
    limit = 50,
    offset = 0
  ): Promise<{ data: AuditLogEntry[]; count: number }> {
    let query = getDb()
      .from("audit_logs")
      .select(
        `id, mess_id, user_id, action, entity_type, entity_id,
         old_value, new_value, created_at,
         user:profiles!user_id(full_name, email)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.messId) query = query.eq("mess_id", filters.messId);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.action) query = query.ilike("action", `%${filters.action}%`);
    if (filters.from)   query = query.gte("created_at", filters.from);
    if (filters.to)     query = query.lte("created_at", filters.to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as AuditLogEntry[], count: count ?? 0 };
  },

  // ============================================================
  // Global Permission Presets
  // ============================================================
  async updateGlobalPreset(
    role: string,
    permissionKey: string,
    allowed: boolean
  ): Promise<void> {
    const { error } = await getDb()
      .from("role_permission_presets")
      .update({ allowed })
      .eq("role", role)
      .eq("permission_key", permissionKey);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // Complaints (platform-wide)
  // ============================================================
  async getAllComplaints(
    statusFilter = "all",
    priorityFilter = "all",
    search = "",
    limit = 50,
    offset = 0
  ): Promise<{ data: any[]; count: number }> {
    let query = getDb()
      .from("complaints")
      .select(
        `id, mess_id, submitted_by, assigned_to, title, description,
         category, priority, status, resolution_note, media_url, resolved_at, created_at, updated_at,
         mess:messes!complaints_mess_id_fkey(name),
         submitter:profiles!complaints_submitted_by_fkey(full_name, email)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: data ?? [], count: count ?? 0 };
  },

  async updateComplaintStatus(
    complaintId: string,
    status: string,
    resolutionNote?: string
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (resolutionNote) payload.resolution_note = resolutionNote;
    if (status === "resolved" || status === "closed") {
      payload.resolved_at = new Date().toISOString();
    }
    const { error } = await getDb()
      .from("complaints")
      .update(payload)
      .eq("id", complaintId);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // Subscription Management
  // ============================================================
  async getSubscriptionPlans(): Promise<any[]> {
    const { data, error } = await getDb()
      .from("subscription_plans")
      .select("*")
      .order("price_monthly", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getMessSubscriptions(): Promise<any[]> {
    const { data, error } = await getDb()
      .from("mess_subscriptions")
      .select(
        `id, mess_id, status, started_at, expires_at,
         plan:subscription_plans(id, name, slug, price_monthly),
         mess:messes!mess_subscriptions_mess_id_fkey(id, name, owner_id,
           owner:profiles!messes_owner_id_fkey(full_name)
         )`
      )
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async assignMessSubscription(
    messId: string,
    planId: string,
    status: string = "active",
    expiresAt?: string | null
  ): Promise<void> {
    // Deactivate any existing active subscription for this mess
    await getDb()
      .from("mess_subscriptions")
      .update({ status: "cancelled" })
      .eq("mess_id", messId)
      .eq("status", "active");

    // Insert new subscription
    const { error } = await getDb()
      .from("mess_subscriptions")
      .insert({
        mess_id: messId,
        plan_id: planId,
        status,
        started_at: new Date().toISOString(),
        expires_at: expiresAt ?? null,
      });
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // Platform Settings
  // ============================================================
  async getPlatformSettings(): Promise<Record<string, string>> {
    const { data, error } = await getDb()
      .from("platform_settings")
      .select("key, value");
    if (error) return {};
    const result: Record<string, string> = {};
    for (const row of data ?? []) result[row.key] = row.value;
    return result;
  },

  async updatePlatformSetting(key: string, value: string): Promise<void> {
    const { error } = await getDb()
      .from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // Announcements
  // ============================================================
  async getAnnouncements(): Promise<PlatformAnnouncement[]> {
    const { data, error } = await getDb()
      .from("platform_announcements")
      .select(`*, sender:profiles!sent_by(full_name)`)
      .order("sent_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as PlatformAnnouncement[];
  },

  async sendAnnouncement(payload: {
    title: string;
    body: string;
    target_type: "all" | "mess" | "role";
    target_id?: string;
    target_role?: string;
    sent_by: string;
  }): Promise<void> {
    const { error } = await getDb()
      .from("platform_announcements")
      .insert({
        title: payload.title,
        body: payload.body,
        target_type: payload.target_type,
        target_id: payload.target_id ?? null,
        target_role: payload.target_role ?? null,
        sent_by: payload.sent_by,
      });
    if (error) throw new Error(error.message);
  },
};
