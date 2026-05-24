"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/lib/services/expense.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { CreateBazaarInput } from "@/lib/validations/expense.schema";

export const BAZAAR_KEYS = {
  all: ["bazaar"] as const,
  list: (messId: string, month: string) =>
    [...BAZAAR_KEYS.all, "list", messId, month] as const,
};

export function useBazaarEntries() {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: BAZAAR_KEYS.list(activeMess?.id ?? "", activeMonth),
    queryFn: () => expenseService.getBazaarEntries(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
  });
}

export function useCreateBazaar() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBazaarInput) =>
      expenseService.createBazaar(activeMess!.id, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BAZAAR_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(getT().toasts.bazaarAdded);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBazaar() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bazaarId,
      expenseId,
      input,
    }: {
      bazaarId: string;
      expenseId: string;
      input: CreateBazaarInput;
    }) => expenseService.updateBazaar(bazaarId, expenseId, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BAZAAR_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(getT().toasts.bazaarUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBazaar() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bazaarId,
      expenseId,
    }: {
      bazaarId: string;
      expenseId: string;
    }) => expenseService.deleteBazaar(bazaarId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BAZAAR_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(getT().toasts.bazaarDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
