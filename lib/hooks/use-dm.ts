"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { dmService } from "@/lib/services/dm.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "./use-auth";
import { getRequiredClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export const DM_KEYS = {
  all: ["dm"] as const,
  conversations: (messId: string, userId: string) =>
    [...DM_KEYS.all, "convs", messId, userId] as const,
  messages: (messId: string, userId: string, partnerId: string) =>
    [...DM_KEYS.all, "msgs", messId, userId, partnerId] as const,
  unread: (messId: string, userId: string) =>
    [...DM_KEYS.all, "unread", messId, userId] as const,
};

export function useConversations() {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  return useQuery({
    queryKey: DM_KEYS.conversations(activeMess?.id!, user?.id!),
    queryFn: () => dmService.getConversations(activeMess!.id, user!.id),
    enabled: !!activeMess?.id && !!user?.id,
    staleTime: 30_000,
  });
}

export function useDMMessages(partnerId: string) {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  return useQuery({
    queryKey: DM_KEYS.messages(activeMess?.id!, user?.id!, partnerId),
    queryFn: () => dmService.getMessages(activeMess!.id, user!.id, partnerId),
    enabled: !!activeMess?.id && !!user?.id && !!partnerId,
    refetchInterval: 10_000,
  });
}

export function useRealtimeDM(partnerId: string) {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeMess?.id || !user?.id || !partnerId) return;
    const supabase = getRequiredClient();
    const channel = supabase
      .channel(`dm:${activeMess.id}:${user.id}:${partnerId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `mess_id=eq.${activeMess.id}`,
      }, () => {
        queryClient.invalidateQueries({
          queryKey: DM_KEYS.messages(activeMess.id, user.id, partnerId),
        });
        queryClient.invalidateQueries({
          queryKey: DM_KEYS.conversations(activeMess.id, user.id),
        });
        queryClient.invalidateQueries({
          queryKey: DM_KEYS.unread(activeMess.id, user.id),
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeMess?.id, user?.id, partnerId, queryClient]);
}

export function useSendDM(partnerId: string) {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      dmService.sendMessage(activeMess!.id, user!.id, partnerId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DM_KEYS.messages(activeMess?.id!, user?.id!, partnerId),
      });
      queryClient.invalidateQueries({
        queryKey: DM_KEYS.conversations(activeMess?.id!, user?.id!),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkDMRead(partnerId: string) {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      dmService.markAsRead(activeMess!.id, partnerId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DM_KEYS.unread(activeMess?.id!, user?.id!) });
      queryClient.invalidateQueries({
        queryKey: DM_KEYS.conversations(activeMess?.id!, user?.id!),
      });
    },
  });
}

export function useDMUnreadCount() {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  return useQuery({
    queryKey: DM_KEYS.unread(activeMess?.id!, user?.id!),
    queryFn: () => dmService.getUnreadCount(activeMess!.id, user!.id),
    enabled: !!activeMess?.id && !!user?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
