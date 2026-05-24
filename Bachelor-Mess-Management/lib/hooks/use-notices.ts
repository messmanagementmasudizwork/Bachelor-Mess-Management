"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noticeService, type CreateNoticeInput } from "@/lib/services/notice.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const NOTICE_KEYS = {
  all: ["notices"] as const,
  list: (messId: string) => [...NOTICE_KEYS.all, "list", messId] as const,
};

export function useNotices() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: NOTICE_KEYS.list(activeMess?.id ?? ""),
    queryFn: () => noticeService.getNotices(activeMess!.id),
    enabled: !!activeMess?.id,
    refetchInterval: 30000,
  });
}

export function useCreateNotice() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoticeInput) =>
      noticeService.createNotice(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all });
      toast.success(getT().toasts.noticePublished);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      noticeService.togglePin(id, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticeService.deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.all });
      toast.success(getT().toasts.noticeDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
