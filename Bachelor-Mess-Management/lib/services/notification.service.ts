import { getRequiredClient } from "@/lib/supabase/client";
import type { NotificationType } from "@/lib/types/notification.types";

export interface CreateNotificationInput {
  user_id: string;
  mess_id?: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

async function triggerWebPush(input: CreateNotificationInput) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: input.user_id,
        title: input.title,
        body: input.body,
        action_url: input.action_url ?? "/dashboard/notifications",
        tag: input.type,
      }),
    });
  } catch {
    // fire-and-forget — push failure must not break in-app notification
  }
}

export const notificationService = {
  async createNotification(input: CreateNotificationInput) {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: input.user_id,
      mess_id: input.mess_id ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      action_url: input.action_url ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (input.metadata ?? null) as any,
      is_read: false,
    });
    if (error) throw new Error(error.message);
    triggerWebPush(input).catch(() => {});
  },

  async createBulkNotifications(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return;

    const supabase = getRequiredClient();
    const rows = inputs.map((n) => ({
      user_id: n.user_id,
      mess_id: n.mess_id ?? null,
      type: n.type,
      title: n.title,
      body: n.body,
      action_url: n.action_url ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (n.metadata ?? null) as any,
      is_read: false,
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) throw new Error(error.message);

    inputs.forEach((input) => triggerWebPush(input).catch(() => {}));
  },

  async getMyNotifications(userId: string, messId?: string) {
    const supabase = getRequiredClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (messId) {
      query = query.or(`mess_id.eq.${messId},mess_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getUnreadCount(userId: string, messId?: string) {
    const supabase = getRequiredClient();
    let query = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (messId) {
      query = query.or(`mess_id.eq.${messId},mess_id.is.null`);
    }

    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markAsRead(notificationId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId);
    if (error) throw new Error(error.message);
  },

  async markAllAsRead(userId: string, messId?: string) {
    const supabase = getRequiredClient();
    let query = supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (messId) {
      query = query.or(`mess_id.eq.${messId},mess_id.is.null`);
    }

    const { error } = await query;
    if (error) throw new Error(error.message);
  },
};
