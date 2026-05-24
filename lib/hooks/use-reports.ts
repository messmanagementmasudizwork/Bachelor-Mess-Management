"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportService } from "@/lib/services/report.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import { MEMBER_KEYS } from "./use-members";

export const REPORT_KEYS = {
  all: ["reports"] as const,
  monthly: (messId: string, month: string) =>
    [...REPORT_KEYS.all, "monthly", messId, month] as const,
  snapshots: (messId: string, memberId: string) =>
    [...REPORT_KEYS.all, "snapshots", messId, memberId] as const,
  snapshot: (messId: string, memberId: string, month: string) =>
    [...REPORT_KEYS.all, "snapshot", messId, memberId, month] as const,
};

export function useMonthlyReport(month: string) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: REPORT_KEYS.monthly(activeMess?.id!, month),
    queryFn: () => reportService.generateMonthlyReport(activeMess!.id, month),
    enabled: !!activeMess?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMySnapshots(memberId: string | undefined) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: REPORT_KEYS.snapshots(activeMess?.id ?? "", memberId ?? ""),
    queryFn: () => reportService.getMySnapshots(activeMess!.id, memberId!),
    enabled: !!activeMess?.id && !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMySnapshot(memberId: string | undefined, month: string) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: REPORT_KEYS.snapshot(activeMess?.id ?? "", memberId ?? "", month),
    queryFn: () => reportService.getMySnapshot(activeMess!.id, memberId!, month),
    enabled: !!activeMess?.id && !!memberId && !!month,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveSnapshot() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, month }: { memberId: string; month: string }) =>
      reportService.saveMySnapshot(activeMess!.id, memberId, month),
    onSuccess: (_, { memberId, month }) => {
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.snapshots(activeMess!.id, memberId) });
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.snapshot(activeMess!.id, memberId, month) });
      const t = getT();
      toast.success(t.myReport.snapshotSaved);
    },
    onError: () => {
      const t = getT();
      toast.error(t.myReport.snapshotError);
    },
  });
}

export function useCloseMonth() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month }: { month: string }) => {
      await reportService.closeMonth(activeMess!.id, month, user!.id);
      const rotated = await reportService.autoRotateManager(activeMess!.id);
      return { rotated };
    },
    onSuccess: ({ rotated }) => {
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.all });
      const t = getT();
      toast.success(rotated ? t.toasts.monthClosedWithRotation : t.toasts.monthClosed);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
