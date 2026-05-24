"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  complaintService,
  type CreateComplaintInput,
  type UpdateComplaintInput,
} from "@/lib/services/complaint.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const COMPLAINT_KEYS = {
  all: ["complaints"] as const,
  list: (messId: string) => [...COMPLAINT_KEYS.all, "list", messId] as const,
};

export function useComplaints() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: COMPLAINT_KEYS.list(activeMess?.id ?? ""),
    queryFn: () => complaintService.getComplaints(activeMess!.id),
    enabled: !!activeMess?.id,
    refetchInterval: 30000,
  });
}

export function useCreateComplaint() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintInput) =>
      complaintService.createComplaint(activeMess!.id, user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPLAINT_KEYS.all });
      toast.success(getT().toasts.complaintSubmitted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateComplaintInput }) =>
      complaintService.updateComplaint(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPLAINT_KEYS.all });
      toast.success(getT().toasts.complaintUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complaintService.deleteComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPLAINT_KEYS.all });
      toast.success(getT().toasts.complaintDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
