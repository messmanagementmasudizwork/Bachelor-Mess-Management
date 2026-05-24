"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminNoticeService,
  type CreateAdminNoticeInput,
} from "@/lib/services/admin-notice.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";

export const ADMIN_NOTICE_KEYS = {
  all:    ["admin_notices"] as const,
  list:   (messId: string) => [...ADMIN_NOTICE_KEYS.all, "list",   messId] as const,
  active: (messId: string) => [...ADMIN_NOTICE_KEYS.all, "active", messId] as const,
};

export function useAdminNotices() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: ADMIN_NOTICE_KEYS.list(activeMess?.id ?? ""),
    queryFn:  () => adminNoticeService.getNotices(activeMess!.id),
    enabled:  !!activeMess?.id,
    refetchInterval: 60_000,
  });
}

export function useLatestActiveAdminNotice() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: ADMIN_NOTICE_KEYS.active(activeMess?.id ?? ""),
    queryFn:  () => adminNoticeService.getLatestActiveNotice(activeMess!.id),
    enabled:  !!activeMess?.id,
    refetchInterval: 60_000,
  });
}

export function useAllActiveAdminNotices() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: [...ADMIN_NOTICE_KEYS.active(activeMess?.id ?? ""), "all"],
    queryFn:  () => adminNoticeService.getActiveNotices(activeMess!.id),
    enabled:  !!activeMess?.id,
    refetchInterval: 60_000,
  });
}

export function useCreateAdminNotice() {
  const { activeMess } = useMessStore();
  const { user }       = useAuthStore();
  const queryClient    = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminNoticeInput) =>
      adminNoticeService.createNotice(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_NOTICE_KEYS.all });
      toast.success("Notice published!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteAdminNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noticeId: string) => adminNoticeService.deleteNotice(noticeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_NOTICE_KEYS.all });
      toast.success("Notice deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
