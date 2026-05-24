"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memberService } from "@/lib/services/member.service";
import { notificationService } from "@/lib/services/notification.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { MemberRole, MemberStatus } from "@/lib/types";

export const MEMBER_KEYS = {
  all: ["members"] as const,
  list: (messId: string) => [...MEMBER_KEYS.all, "list", messId] as const,
  me: (messId: string, userId: string) => [...MEMBER_KEYS.all, "me", messId, userId] as const,
  manager: (messId: string) => [...MEMBER_KEYS.all, "manager", messId] as const,
};

export function useMembers() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MEMBER_KEYS.list(activeMess?.id!),
    queryFn: () => memberService.getMessMembers(activeMess!.id),
    enabled: !!activeMess?.id,
  });
}

export function useMyMembership() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MEMBER_KEYS.me(activeMess?.id!, user?.id!),
    queryFn: () => memberService.getMemberByUserId(activeMess!.id, user!.id),
    enabled: !!activeMess?.id && !!user?.id,
  });
}

export function useManagerHistory() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MEMBER_KEYS.manager(activeMess?.id!),
    queryFn: () => memberService.getManagerHistory(activeMess!.id),
    enabled: !!activeMess?.id,
  });
}

export function useUpdateMemberRole() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) =>
      memberService.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.list(activeMess?.id!) });
      toast.success(getT().toasts.roleUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAssignManager() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, note }: { memberId: string; note?: string }) =>
      memberService.assignManager(activeMess!.id, memberId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.all });
      const t = getT();
      toast.success(t.toasts.managerAssigned);
      notificationService.createNotification({
        user_id: user!.id,
        mess_id: activeMess?.id,
        type: "manager_changed",
        title: t.toasts.managerNotif,
        body: t.toasts.managerNotifBody,
        action_url: "/dashboard/manager",
      }).catch(() => {});
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveMember() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; reason?: string }) =>
      memberService.removeMember(memberId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.list(activeMess?.id!) });
      toast.success(getT().toasts.memberRemoved);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateMemberStatus() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: MemberStatus }) =>
      memberService.updateMemberStatus(memberId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.list(activeMess?.id!) });
      toast.success(getT().toasts.statusUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSetMemberLeave() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, leaveStart, leaveEnd }: { memberId: string; leaveStart: string; leaveEnd: string }) =>
      memberService.setManagerLeave(memberId, leaveStart, leaveEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.list(activeMess?.id!) });
      toast.success(getT().toasts.leaveUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateMealDefaults() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      defaults,
    }: {
      memberId: string;
      defaults: { meal_default_breakfast?: boolean; meal_default_lunch?: boolean; meal_default_dinner?: boolean };
    }) => memberService.updateMealDefaults(memberId, defaults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MEMBER_KEYS.me(activeMess?.id!, "")] });
      toast.success(getT().toasts.defaultMealSaved);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateSeatNumber() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, seatNumber }: { memberId: string; seatNumber: number | null }) =>
      memberService.updateSeatNumber(memberId, seatNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.list(activeMess?.id!) });
      toast.success(getT().toasts.seatUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
