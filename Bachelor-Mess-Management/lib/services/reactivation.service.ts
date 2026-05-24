// ============================================================
// Reactivation Service
// Manages leave violations, account status, and reactivation requests
// ============================================================

import { getRequiredClient } from "@/lib/supabase/client";
import type { AccountStatus, ReactivationRequest } from "@/lib/types";

export const reactivationService = {

  // ── Member status updates ──────────────────────────────────

  async markOpenLeaveStarted(memberId: string): Promise<void> {
    const supabase = getRequiredClient();
    const today = new Date().toISOString().split("T")[0]!;
    const { error } = await supabase
      .from("mess_members")
      .update({ open_leave_started: today })
      .eq("id", memberId)
      .is("open_leave_started", null);
    if (error) throw new Error(error.message);
  },

  async clearOpenLeave(memberId: string, currentStatus: AccountStatus): Promise<void> {
    if (currentStatus === "banned" || currentStatus === "closed") return;
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({
        open_leave_started: null,
        leave_violation_since: null,
        account_status: "active",
      })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async syncViolationStatus(
    memberId: string,
    newStatus: AccountStatus,
    violationSince: string | null
  ): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({
        account_status: newStatus,
        leave_violation_since: violationSince,
      })
      .eq("id", memberId)
      .neq("account_status", "closed");
    if (error) throw new Error(error.message);
  },

  async reactivateMember(memberId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("mess_members")
      .update({
        account_status: "active",
        open_leave_started: null,
        leave_violation_since: null,
      })
      .eq("id", memberId)
      .neq("account_status", "closed");
    if (error) throw new Error(error.message);
  },

  // ── Reactivation requests ──────────────────────────────────

  async submitRequest(
    messId: string,
    memberId: string,
    proofText: string,
    proofFileUrl: string | null
  ): Promise<ReactivationRequest> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("reactivation_requests")
      .insert({
        mess_id: messId,
        member_id: memberId,
        proof_text: proofText || null,
        proof_file_url: proofFileUrl || null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ReactivationRequest;
  },

  async getPendingRequests(messId: string): Promise<ReactivationRequest[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("reactivation_requests")
      .select(`
        *,
        member:mess_members(
          id, role, account_status, open_leave_started, leave_violation_since,
          user:profiles(id, full_name, avatar_url, phone)
        )
      `)
      .eq("mess_id", messId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReactivationRequest[];
  },

  async getAllRequests(messId: string): Promise<ReactivationRequest[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("reactivation_requests")
      .select(`
        *,
        member:mess_members(
          id, role, account_status,
          user:profiles(id, full_name, avatar_url)
        )
      `)
      .eq("mess_id", messId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReactivationRequest[];
  },

  async getMyRequests(memberId: string): Promise<ReactivationRequest[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("reactivation_requests")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReactivationRequest[];
  },

  async reviewRequest(
    requestId: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    reviewerNotes: string,
    memberId: string
  ): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("reactivation_requests")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewerNotes || null,
      })
      .eq("id", requestId);
    if (error) throw new Error(error.message);

    if (status === "approved") {
      await reactivationService.reactivateMember(memberId);
    }
  },

  // ── Proof file upload ──────────────────────────────────────

  async uploadProofFile(memberId: string, file: File): Promise<string> {
    const supabase = getRequiredClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${memberId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("reactivation-proofs")
      .upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);

    const { data: urlData } = supabase.storage
      .from("reactivation-proofs")
      .getPublicUrl(path);
    return urlData.publicUrl;
  },
};
