import { getRequiredClient } from "@/lib/supabase/client";

export interface Notice {
  id: string;
  mess_id: string;
  created_by: string;
  title: string;
  content: string;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  is_pinned?: boolean;
  expires_at?: string | null;
}

export const noticeService = {
  async getNotices(messId: string): Promise<Notice[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("notices")
      .select("*, profiles!notices_created_by_fkey(full_name)")
      .eq("mess_id", messId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      creator_name: row.profiles?.full_name ?? null,
    }));
  },

  async createNotice(messId: string, userId: string, input: CreateNoticeInput): Promise<Notice> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("notices")
      .insert({
        mess_id: messId,
        created_by: userId,
        title: input.title,
        content: input.content,
        is_pinned: input.is_pinned ?? false,
        expires_at: input.expires_at ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async togglePin(noticeId: string, isPinned: boolean): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("notices")
      .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq("id", noticeId);
    if (error) throw new Error(error.message);
  },

  async deleteNotice(noticeId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("notices").delete().eq("id", noticeId);
    if (error) throw new Error(error.message);
  },
};
