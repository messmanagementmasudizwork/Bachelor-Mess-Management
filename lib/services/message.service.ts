import { getRequiredClient } from "@/lib/supabase/client";
import { getT } from "@/lib/i18n/get-t";

export type MessageType = "text" | "announcement" | "voice" | "event";

export interface Message {
  id: string;
  mess_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  audio_url?: string | null;
  reply_to: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface SendMessageInput {
  content: string;
  message_type?: MessageType;
  audio_url?: string | null;
  reply_to?: string | null;
}

export interface MessEvent {
  id: string;
  mess_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_date: string;
  location?: string;
}

export const messageService = {
  async getMessages(messId: string, limit = 50): Promise<Message[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles!messages_sender_id_fkey(full_name, avatar_url)")
      .eq("mess_id", messId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      sender_name: row.profiles?.full_name ?? getT().gamificationExt.unknownUser,
      sender_avatar: row.profiles?.avatar_url ?? null,
    }));
  },

  async sendMessage(messId: string, senderId: string, input: SendMessageInput): Promise<Message> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        mess_id: messId,
        sender_id: senderId,
        content: input.content,
        message_type: input.message_type ?? "text",
        audio_url: input.audio_url ?? null,
        reply_to: input.reply_to ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) throw new Error(error.message);
  },

  async getEvents(messId: string): Promise<MessEvent[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("events")
      .select("*, profiles!events_created_by_fkey(full_name)")
      .eq("mess_id", messId)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      creator_name: row.profiles?.full_name ?? null,
    }));
  },

  async createEvent(messId: string, userId: string, input: CreateEventInput): Promise<MessEvent> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        mess_id: messId,
        created_by: userId,
        title: input.title,
        description: input.description ?? null,
        event_date: input.event_date,
        location: input.location ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) throw new Error(error.message);
  },
};
