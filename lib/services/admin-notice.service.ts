import { getRequiredClient } from "@/lib/supabase/client";
import { notificationService } from "@/lib/services/notification.service";

export type NoticeType = "notice" | "meeting";

export interface AdminNotice {
  id: string;
  mess_id: string;
  title: string;
  body: string;
  notice_type: NoticeType;
  publish_at: string | null;
  expires_at: string | null;
  meeting_at: string | null;
  reminder_1day_sent: boolean;
  reminder_30min_sent: boolean;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
}

export interface CreateAdminNoticeInput {
  title: string;
  body: string;
  notice_type: NoticeType;
  publish_at: string | null;
  expires_at?: string | null;
  meeting_at?: string | null;
}

function isNoticeVisible(n: AdminNotice, now: Date): boolean {
  // Must be published (publish_at has passed or is null)
  if (n.publish_at && new Date(n.publish_at) > now) return false;
  // Must not be expired
  if (n.expires_at && new Date(n.expires_at) <= now) return false;
  return true;
}

export const adminNoticeService = {
  /** Single notice by ID */
  async getNoticeById(noticeId: string): Promise<AdminNotice | null> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("admin_notices")
      .select("*, profiles!admin_notices_created_by_fkey(full_name)")
      .eq("id", noticeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { ...(data as any), creator_name: (data as any).profiles?.full_name ?? null };
  },

  /** All published notices for the admin panel list (shows scheduled too) */
  async getNotices(messId: string): Promise<AdminNotice[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("admin_notices")
      .select("*, profiles!admin_notices_created_by_fkey(full_name)")
      .eq("mess_id", messId)
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      creator_name: row.profiles?.full_name ?? null,
    }));
  },

  /** All currently active notices (for ticker — published + not expired) */
  async getActiveNotices(messId: string): Promise<AdminNotice[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("admin_notices")
      .select("*")
      .eq("mess_id", messId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const now = new Date();
    return (data ?? []).filter((n: AdminNotice) => isNoticeVisible(n, now));
  },

  /** Single latest active notice (kept for NoticeBanner on meals page) */
  async getLatestActiveNotice(messId: string): Promise<AdminNotice | null> {
    const notices = await adminNoticeService.getActiveNotices(messId);
    return notices[0] ?? null;
  },

  async createNotice(
    messId: string,
    userId: string,
    input: CreateAdminNoticeInput
  ): Promise<AdminNotice> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("admin_notices")
      .insert({
        mess_id:      messId,
        created_by:   userId,
        title:        input.title,
        body:         input.body,
        notice_type:  input.notice_type,
        publish_at:   input.publish_at,
        expires_at:   input.expires_at ?? null,
        meeting_at:   input.meeting_at ?? null,
        is_published: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Send in-app notifications to all active mess members (immediate notices only)
    const isImmediate = !input.publish_at || new Date(input.publish_at) <= new Date();
    if (isImmediate) {
      try {
        const { data: members } = await supabase
          .from("mess_members")
          .select("user_id")
          .eq("mess_id", messId)
          .eq("status", "active");

        if (members && members.length > 0) {
          const typeLabel = input.notice_type === "meeting" ? "📅 Meeting" : "📢 Notice";
          await notificationService.createBulkNotifications(
            members.map((m: { user_id: string }) => ({
              user_id:    m.user_id,
              mess_id:    messId,
              type:       "admin_notice" as const,
              title:      `${typeLabel}: ${input.title}`,
              body:       input.body.slice(0, 200),
              action_url: "/dashboard/notice-vacation",
              metadata: {
                notice_id:   data.id,
                notice_type: input.notice_type,
                meeting_at:  input.meeting_at ?? null,
              },
            }))
          );
        }
      } catch {
        // Notification failure must not block notice creation
      }
    }

    return data;
  },

  async deleteNotice(noticeId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("admin_notices")
      .delete()
      .eq("id", noticeId);
    if (error) throw new Error(error.message);
  },
};
