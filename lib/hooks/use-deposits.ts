"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { depositService } from "@/lib/services/deposit.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { useRealtimeInvalidation } from "./use-realtime";
import { notificationService } from "@/lib/services/notification.service";
import { prevMonth } from "@/lib/utils/date";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { CreateDepositInput } from "@/lib/validations/deposit.schema";

export const DEPOSIT_KEYS = {
  all: ["deposits"] as const,
  monthly: (messId: string, month: string) =>
    [...DEPOSIT_KEYS.all, "monthly", messId, month] as const,
  member: (messId: string, memberId: string, month: string) =>
    [...DEPOSIT_KEYS.all, "member", messId, memberId, month] as const,
  balances: (messId: string, month: string) =>
    [...DEPOSIT_KEYS.all, "balances", messId, month] as const,
};

export function useMonthlyDeposits() {
  const { activeMess, activeMonth } = useMessStore();
  useRealtimeInvalidation({
    table: "deposits",
    queryKeys: [[...DEPOSIT_KEYS.all]],
  });
  return useQuery({
    queryKey: DEPOSIT_KEYS.monthly(activeMess?.id!, activeMonth),
    queryFn: () => depositService.getMonthlyDeposits(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
  });
}

export function useMemberBalances() {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: DEPOSIT_KEYS.balances(activeMess?.id!, activeMonth),
    queryFn: () => depositService.getAllMemberBalances(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
    refetchInterval: 60000,
  });
}

export function usePrevMonthBalances() {
  const { activeMess, activeMonth } = useMessStore();
  const prev = prevMonth(activeMonth);
  return useQuery({
    queryKey: DEPOSIT_KEYS.balances(activeMess?.id!, prev),
    queryFn: () => depositService.getAllMemberBalances(activeMess!.id, prev),
    enabled: !!activeMess?.id,
    staleTime: 5 * 60_000,
  });
}

export function useMyBalance(memberId?: string) {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: [...DEPOSIT_KEYS.member(activeMess?.id!, memberId!, activeMonth), "balance"],
    queryFn: () => depositService.getMemberBalance(activeMess!.id, memberId!, activeMonth),
    enabled: !!activeMess?.id && !!memberId,
    refetchInterval: 60000,
  });
}

export function useCreateDeposit() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();
  const { data: myMembership } = useQuery({
    queryKey: ["members", "me", activeMess?.id, user?.id],
    queryFn: async () => {
      const { memberService } = await import("@/lib/services/member.service");
      return memberService.getMemberByUserId(activeMess!.id, user!.id);
    },
    enabled: !!activeMess?.id && !!user?.id,
    staleTime: 5 * 60_000,
  });

  return useMutation({
    mutationFn: (input: CreateDepositInput) => {
      const inputWithMember: CreateDepositInput = {
        ...input,
        member_id: input.member_id ?? myMembership?.id,
      };
      return depositService.createDeposit(activeMess!.id, inputWithMember, user!.id);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_KEYS.all });
      const t = getT();
      toast.success(t.toasts.depositAdded);
      notificationService.createNotification({
        user_id: user!.id,
        mess_id: activeMess?.id,
        type: "deposit_confirmed",
        title: t.toasts.depositNotification,
        body: t.toasts.depositNotificationBody.replace("{amount}", String(input.amount)),
        action_url: "/dashboard/deposits",
      }).catch(() => {});
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useConfirmDeposit() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (depositId: string) => depositService.confirmDeposit(depositId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_KEYS.all });
      const t = getT();
      toast.success(t.toasts.depositConfirmed);
      notificationService.createNotification({
        user_id: user!.id,
        mess_id: activeMess?.id,
        type: "deposit_confirmed",
        title: t.toasts.depositConfirmedNotif,
        body: t.toasts.depositConfirmedNotifBody,
        action_url: "/dashboard/deposits",
      }).catch(() => {});
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRejectDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (depositId: string) => depositService.rejectDeposit(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_KEYS.all });
      toast.success(getT().toasts.depositCancelled);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
