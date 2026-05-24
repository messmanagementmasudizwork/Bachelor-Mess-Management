"use client";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { messageService, type SendMessageInput, type CreateEventInput } from "@/lib/services/message.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useEffect } from "react";
import { getRequiredClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const MESSAGE_KEYS = {
  all: ["messages"] as const,
  chat: (messId: string) => [...MESSAGE_KEYS.all, "chat", messId] as const,
  events: (messId: string) => [...MESSAGE_KEYS.all, "events", messId] as const,
};

export function useMessages() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MESSAGE_KEYS.chat(activeMess?.id ?? ""),
    queryFn: () => messageService.getMessages(activeMess!.id),
    enabled: !!activeMess?.id,
    refetchInterval: 10000,
  });
}

export function useRealtimeMessages() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeMess?.id) return;
    const supabase = getRequiredClient();
    const channel = supabase
      .channel(`messages-${activeMess.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `mess_id=eq.${activeMess.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.chat(activeMess.id) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeMess?.id, queryClient]);
}

export function useSendMessage() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      messageService.sendMessage(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.chat(activeMess?.id ?? "") });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteMessage() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messageService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.chat(activeMess?.id ?? "") });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useEvents() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MESSAGE_KEYS.events(activeMess?.id ?? ""),
    queryFn: () => messageService.getEvents(activeMess!.id),
    enabled: !!activeMess?.id,
  });
}

export function useCreateEvent() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      messageService.createEvent(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.events(activeMess?.id ?? "") });
      toast.success(getT().toasts.eventAdded);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteEvent() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messageService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.events(activeMess?.id ?? "") });
      toast.success(getT().toasts.eventDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
