import { getRequiredClient } from "@/lib/supabase/client";

export interface AuditLog {
  id: string;
  mess_id: string | null;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name?: string; avatar_url?: string } | null;
}

export interface LoginHistoryEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export const auditService = {
  async getExpenseAuditLog(expenseId: string, messId: string): Promise<AuditLog[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        id, mess_id, user_id, action, entity_type, entity_id, created_at, old_value, new_value,
        user:profiles(full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .eq("entity_type", "expense")
      .eq("entity_id", expenseId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AuditLog[];
  },

  async getMessActivityLog(messId: string, limit = 50): Promise<AuditLog[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        id, mess_id, user_id, action, entity_type, entity_id, created_at,
        user:profiles(full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AuditLog[];
  },

  async logLoginEvent(userId: string, meta?: { device?: string; browser?: string }) {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      mess_id: null,
      action: "login",
      entity_type: "auth",
      entity_id: userId,
      old_value: null,
      new_value: {
        timestamp: new Date().toISOString(),
        device: meta?.device ?? (typeof navigator !== "undefined" ? navigator.platform : "unknown"),
        browser: meta?.browser ?? (typeof navigator !== "undefined" ? navigator.userAgent.split(" ").pop()?.split("/")[0] ?? "unknown" : "unknown"),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    });
    if (error) console.error("Login log error:", error.message);
  },

  async logLogoutEvent(userId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      mess_id: null,
      action: "logout",
      entity_type: "auth",
      entity_id: userId,
      old_value: null,
      new_value: { timestamp: new Date().toISOString() },
    });
    if (error) console.error("Logout log error:", error.message);
  },

  async getLoginHistory(userId: string, limit = 20): Promise<LoginHistoryEntry[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, user_id, action, entity_type, new_value, created_at")
      .eq("user_id", userId)
      .eq("entity_type", "auth")
      .in("action", ["login", "logout"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as LoginHistoryEntry[];
  },
};
