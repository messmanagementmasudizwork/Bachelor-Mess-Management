"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pollService, type CreatePollInput } from "@/lib/services/poll.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const POLL_KEYS = {
  all: ["polls"] as const,
  list: (messId: string) => [...POLL_KEYS.all, "list", messId] as const,
  votes: (pollId: string) => [...POLL_KEYS.all, "votes", pollId] as const,
  myVote: (pollId: string, userId: string) => [...POLL_KEYS.all, "myVote", pollId, userId] as const,
};

export function usePolls() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: POLL_KEYS.list(activeMess?.id ?? ""),
    queryFn: () => pollService.getPolls(activeMess!.id),
    enabled: !!activeMess?.id,
    refetchInterval: 30000,
  });
}

export function usePollVotes(pollId: string) {
  return useQuery({
    queryKey: POLL_KEYS.votes(pollId),
    queryFn: () => pollService.getVotesForPoll(pollId),
    enabled: !!pollId,
  });
}

export function useMyVote(pollId: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: POLL_KEYS.myVote(pollId, user?.id ?? ""),
    queryFn: () => pollService.getMyVote(pollId, user!.id),
    enabled: !!pollId && !!user?.id,
  });
}

export function useCreatePoll() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePollInput) =>
      pollService.createPoll(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.all });
      toast.success(getT().toasts.pollCreated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useClosePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollService.closePoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.all });
      toast.success(getT().toasts.pollClosed);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollService.deletePoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.all });
      toast.success(getT().toasts.pollDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCastVote() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      pollService.castVote(pollId, activeMess!.id, user!.id, optionId),
    onSuccess: (_data, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.votes(pollId) });
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.myVote(pollId, user?.id ?? "") });
      toast.success(getT().toasts.voteSubmitted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useChangeVote() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      pollService.changeVote(pollId, activeMess!.id, user!.id, optionId),
    onSuccess: (_data, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.votes(pollId) });
      queryClient.invalidateQueries({ queryKey: POLL_KEYS.myVote(pollId, user?.id ?? "") });
      toast.success(getT().toasts.voteChanged);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
