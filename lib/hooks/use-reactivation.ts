"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reactivationService } from "@/lib/services/reactivation.service";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

// ── Query keys ────────────────────────────────────────────────
export const reactivationKeys = {
  pending: (messId: string) => ["reactivation", "pending", messId] as const,
  all: (messId: string) => ["reactivation", "all", messId] as const,
  mine: (memberId: string) => ["reactivation", "mine", memberId] as const,
};

// ── Queries ───────────────────────────────────────────────────

export function usePendingRequests(messId?: string) {
  return useQuery({
    queryKey: reactivationKeys.pending(messId ?? ""),
    queryFn: () => reactivationService.getPendingRequests(messId!),
    enabled: !!messId,
  });
}

export function useAllRequests(messId?: string) {
  return useQuery({
    queryKey: reactivationKeys.all(messId ?? ""),
    queryFn: () => reactivationService.getAllRequests(messId!),
    enabled: !!messId,
  });
}

export function useMyRequests(memberId?: string) {
  return useQuery({
    queryKey: reactivationKeys.mine(memberId ?? ""),
    queryFn: () => reactivationService.getMyRequests(memberId!),
    enabled: !!memberId,
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useSubmitReactivationRequest(messId?: string, memberId?: string) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({
      proofText,
      proofFileUrl,
    }: {
      proofText: string;
      proofFileUrl: string | null;
    }) => reactivationService.submitRequest(messId!, memberId!, proofText, proofFileUrl),
    onSuccess: () => {
      toast.success(t.violations.requestSubmitted);
      qc.invalidateQueries({ queryKey: reactivationKeys.mine(memberId ?? "") });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReviewRequest(messId?: string) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({
      requestId,
      status,
      reviewedBy,
      reviewerNotes,
      memberId,
    }: {
      requestId: string;
      status: "approved" | "rejected";
      reviewedBy: string;
      reviewerNotes: string;
      memberId: string;
    }) =>
      reactivationService.reviewRequest(requestId, status, reviewedBy, reviewerNotes, memberId),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.status === "approved" ? t.violations.memberReactivated : t.violations.requestRejected
      );
      qc.invalidateQueries({ queryKey: reactivationKeys.pending(messId ?? "") });
      qc.invalidateQueries({ queryKey: reactivationKeys.all(messId ?? "") });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkOpenLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => reactivationService.markOpenLeaveStarted(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useClearOpenLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, currentStatus }: { memberId: string; currentStatus: import("@/lib/types").AccountStatus }) =>
      reactivationService.clearOpenLeave(memberId, currentStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useSyncViolationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      newStatus,
      violationSince,
    }: {
      memberId: string;
      newStatus: import("@/lib/types").AccountStatus;
      violationSince: string | null;
    }) => reactivationService.syncViolationStatus(memberId, newStatus, violationSince),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
    onError: () => {}, // silent — background sync
  });
}
