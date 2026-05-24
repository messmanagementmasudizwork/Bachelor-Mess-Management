import { getRequiredClient } from "@/lib/supabase/client";

export type ComplaintCategory = "food" | "cleaning" | "maintenance" | "member" | "billing" | "other";
export type ComplaintPriority = "low" | "medium" | "high" | "urgent";
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed" | "rejected";

export interface Complaint {
  id: string;
  mess_id: string;
  submitted_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  submitter_name?: string;
  assignee_name?: string;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  media_url?: string | null;
}

export interface UpdateComplaintInput {
  status?: ComplaintStatus;
  resolution_note?: string;
  assigned_to?: string | null;
  priority?: ComplaintPriority;
}

export const complaintService = {
  async getComplaints(messId: string): Promise<Complaint[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("complaints")
      .select(`
        *,
        submitter:profiles!complaints_submitted_by_fkey(full_name),
        assignee:profiles!complaints_assigned_to_fkey(full_name)
      `)
      .eq("mess_id", messId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      submitter_name: row.submitter?.full_name ?? null,
      assignee_name: row.assignee?.full_name ?? null,
    }));
  },

  async createComplaint(messId: string, userId: string, input: CreateComplaintInput): Promise<Complaint> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("complaints")
      .insert({
        mess_id: messId,
        submitted_by: userId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: "open",
        ...(input.media_url ? { media_url: input.media_url } : {}),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateComplaint(complaintId: string, input: UpdateComplaintInput): Promise<void> {
    const supabase = getRequiredClient();
    const isFinished = input.status === "resolved" || input.status === "closed";
    const { error } = await supabase
      .from("complaints")
      .update({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
        ...(input.resolution_note !== undefined && { resolution_note: input.resolution_note }),
        ...(isFinished && { resolved_at: new Date().toISOString() }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);
    if (error) throw new Error(error.message);
  },

  async deleteComplaint(complaintId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("complaints").delete().eq("id", complaintId);
    if (error) throw new Error(error.message);
  },
};
