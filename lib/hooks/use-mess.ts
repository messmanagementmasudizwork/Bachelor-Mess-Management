"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messService } from "@/lib/services/mess.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { CreateMessInput } from "@/lib/validations/mess.schema";

export const MESS_KEYS = {
  all: ["mess"] as const,
  lists: () => [...MESS_KEYS.all, "list"] as const,
  detail: (id: string) => [...MESS_KEYS.all, "detail", id] as const,
  stats: (id: string) => [...MESS_KEYS.all, "stats", id] as const,
};

export function useUserMesses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: MESS_KEYS.lists(),
    queryFn: () => messService.getUserMesses(user!.id),
    enabled: !!user,
  });
}

export function useMess(messId?: string) {
  return useQuery({
    queryKey: MESS_KEYS.detail(messId!),
    queryFn: () => messService.getMessById(messId!),
    enabled: !!messId,
  });
}

export function useMessStats(messId?: string) {
  return useQuery({
    queryKey: MESS_KEYS.stats(messId!),
    queryFn: () => messService.getDashboardStats(messId!),
    enabled: !!messId,
    refetchInterval: 60000,
  });
}

export function useCreateMess() {
  const { user } = useAuth();
  const { setActiveMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMessInput) =>
      messService.createMess(input, user!.id),
    onSuccess: (mess) => {
      queryClient.invalidateQueries({ queryKey: MESS_KEYS.lists() });
      setActiveMess({
        id: mess.id,
        name: mess.name,
        role: "owner",
        avatar_url: null,
        is_month_closed: false,
        settings: null,
      });
      toast.success(getT().toasts.messCreated);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useJoinMess() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) =>
      messService.joinMess(inviteCode, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESS_KEYS.lists() });
      toast.success(getT().toasts.messJoined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
