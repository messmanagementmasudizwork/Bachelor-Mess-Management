import { getRequiredClient } from "@/lib/supabase/client";

export type PollType = "menu_vote" | "manager_selection" | "rule_change" | "general";
export type PollStatus = "active" | "closed";

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  mess_id: string;
  created_by: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  is_anonymous: boolean;
  options: PollOption[];
  closes_at: string | null;
  status: PollStatus;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  mess_id: string;
  voter_id: string;
  option_id: string;
  created_at: string;
  voter_name?: string;
}

export interface CreatePollInput {
  title: string;
  description?: string;
  poll_type: PollType;
  is_anonymous: boolean;
  options: PollOption[];
  closes_at?: string | null;
}

export const pollService = {
  async getPolls(messId: string): Promise<Poll[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*, profiles!polls_created_by_fkey(full_name)")
      .eq("mess_id", messId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      options: Array.isArray(row.options) ? row.options : [],
      creator_name: row.profiles?.full_name ?? null,
    }));
  },

  async createPoll(messId: string, userId: string, input: CreatePollInput): Promise<Poll> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("polls")
      .insert({
        mess_id: messId,
        created_by: userId,
        title: input.title,
        description: input.description ?? null,
        poll_type: input.poll_type,
        is_anonymous: input.is_anonymous,
        options: input.options,
        closes_at: input.closes_at ?? null,
        status: "active",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...data, options: Array.isArray(data.options) ? data.options : [] };
  },

  async closePoll(pollId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("polls")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", pollId);
    if (error) throw new Error(error.message);
  },

  async deletePoll(pollId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) throw new Error(error.message);
  },

  async getVotesForPoll(pollId: string): Promise<PollVote[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("poll_votes")
      .select("*, profiles!poll_votes_voter_id_fkey(full_name)")
      .eq("poll_id", pollId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      voter_name: row.profiles?.full_name ?? null,
    }));
  },

  async getMyVote(pollId: string, userId: string): Promise<PollVote | null> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("poll_id", pollId)
      .eq("voter_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async castVote(pollId: string, messId: string, voterId: string, optionId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      mess_id: messId,
      voter_id: voterId,
      option_id: optionId,
    });
    if (error) throw new Error(error.message);
  },

  async changeVote(pollId: string, messId: string, voterId: string, optionId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error: delError } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("voter_id", voterId);
    if (delError) throw new Error(delError.message);
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      mess_id: messId,
      voter_id: voterId,
      option_id: optionId,
    });
    if (error) throw new Error(error.message);
  },
};
