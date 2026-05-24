/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { getT } from "@/lib/i18n/get-t";

export interface DirectMessage {
  id: string;
  mess_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_avatar?: string;
}

export interface DMConversation {
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string;
  last_at: string;
  unread_count: number;
}

function getDb() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase not configured");
  // Use 'as any' because direct_messages is a runtime table not in generated types yet
  return (supabase as any).from("direct_messages");
}

export const dmService = {
  async getConversations(messId: string, userId: string): Promise<DMConversation[]> {
    const { data, error } = await getDb()
      .select(`
        id, sender_id, recipient_id, content, is_read, created_at,
        sender:profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url),
        recipient:profiles!direct_messages_recipient_id_fkey(id, full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const convMap = new Map<string, DMConversation>();
    for (const row of (data ?? []) as any[]) {
      const isMe = row.sender_id === userId;
      const partner = isMe ? row.recipient : row.sender;
      const partnerId: string = partner?.id ?? "";
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partner_id: partnerId,
          partner_name: partner?.full_name ?? getT().gamificationExt.unknownMember,
          partner_avatar: partner?.avatar_url ?? null,
          last_message: row.content,
          last_at: row.created_at,
          unread_count: !isMe && !row.is_read ? 1 : 0,
        });
      } else {
        const existing = convMap.get(partnerId)!;
        if (!isMe && !row.is_read) {
          existing.unread_count += 1;
        }
      }
    }
    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );
  },

  async getMessages(
    messId: string,
    userId: string,
    partnerId: string,
    limit = 50
  ): Promise<DirectMessage[]> {
    const { data, error } = await getDb()
      .select(`
        *,
        sender:profiles!direct_messages_sender_id_fkey(full_name, avatar_url),
        recipient:profiles!direct_messages_recipient_id_fkey(full_name, avatar_url)
      `)
      .eq("mess_id", messId)
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
      )
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      mess_id: row.mess_id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      content: row.content,
      is_read: row.is_read,
      read_at: row.read_at,
      created_at: row.created_at,
      sender_name: row.sender?.full_name ?? getT().gamificationExt.unknownMember,
      sender_avatar: row.sender?.avatar_url ?? null,
      recipient_name: row.recipient?.full_name ?? getT().gamificationExt.unknownMember,
      recipient_avatar: row.recipient?.avatar_url ?? null,
    }));
  },

  async sendMessage(
    messId: string,
    senderId: string,
    recipientId: string,
    content: string
  ): Promise<DirectMessage> {
    const { data, error } = await getDb()
      .insert({ mess_id: messId, sender_id: senderId, recipient_id: recipientId, content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DirectMessage;
  },

  async markAsRead(messId: string, senderId: string, recipientId: string): Promise<void> {
    const { error } = await getDb()
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("mess_id", messId)
      .eq("sender_id", senderId)
      .eq("recipient_id", recipientId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await getDb().delete().eq("id", messageId);
    if (error) throw new Error(error.message);
  },

  async getUnreadCount(messId: string, userId: string): Promise<number> {
    const { count, error } = await getDb()
      .select("*", { count: "exact", head: true })
      .eq("mess_id", messId)
      .eq("recipient_id", userId)
      .eq("is_read", false);
    if (error) return 0;
    return count ?? 0;
  },
};
