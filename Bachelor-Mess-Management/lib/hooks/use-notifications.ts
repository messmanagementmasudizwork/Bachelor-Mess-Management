"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/lib/services/notification.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { useRealtimeNotifications } from "./use-realtime";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (userId: string, messId?: string) =>
    [...NOTIFICATION_KEYS.all, "list", userId, messId ?? "global"] as const,
  unread: (userId: string, messId?: string) =>
    [...NOTIFICATION_KEYS.all, "unread", userId, messId ?? "global"] as const,
};

export function useNotifications() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(user?.id!, activeMess?.id),
    queryFn: () => notificationService.getMyNotifications(user!.id, activeMess?.id),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  // Realtime subscription lives here — Header always mounts this hook,
  // so the bell stays in sync from ANY page without needing a refresh.
  useRealtimeNotifications(
    [[...NOTIFICATION_KEYS.all]],
    user?.id
  );
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unread(user?.id!, activeMess?.id),
    queryFn: () => notificationService.getUnreadCount(user!.id, activeMess?.id),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useMarkAllAsRead() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      notificationService.markAllAsRead(user!.id, activeMess?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      toast.success(getT().toasts.allNotificationsRead);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
