"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/lib/services/expense.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { useRealtimeInvalidation } from "./use-realtime";
import { notificationService } from "@/lib/services/notification.service";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { CreateExpenseInput, CreateBazaarInput } from "@/lib/validations/expense.schema";

export const EXPENSE_KEYS = {
  all: ["expenses"] as const,
  monthly: (messId: string, month: string) =>
    [...EXPENSE_KEYS.all, "monthly", messId, month] as const,
  bazaar: (messId: string, month: string) =>
    [...EXPENSE_KEYS.all, "bazaar", messId, month] as const,
  summary: (messId: string, month: string) =>
    [...EXPENSE_KEYS.all, "summary", messId, month] as const,
};

export function useMonthlyExpenses() {
  const { activeMess, activeMonth } = useMessStore();
  useRealtimeInvalidation({
    table: "expenses",
    queryKeys: [[...EXPENSE_KEYS.all]],
  });
  return useQuery({
    queryKey: EXPENSE_KEYS.monthly(activeMess?.id!, activeMonth),
    queryFn: () => expenseService.getMonthlyExpenses(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
  });
}

export function useBazaarEntries() {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: EXPENSE_KEYS.bazaar(activeMess?.id!, activeMonth),
    queryFn: () => expenseService.getBazaarEntries(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
  });
}

export function useExpenseSummary() {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: EXPENSE_KEYS.summary(activeMess?.id!, activeMonth),
    queryFn: () => expenseService.getExpenseSummary(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
    refetchInterval: 60000,
  });
}

export function useCreateExpense() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      expenseService.createExpense(activeMess!.id, input, user!.id),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all });
      const t = getT();
      toast.success(t.toasts.expenseAdded);
      notificationService.createNotification({
        user_id: user!.id,
        mess_id: activeMess?.id,
        type: "expense_added",
        title: t.toasts.expenseNotification,
        body: `৳${input.amount} — ${input.title}`,
        action_url: "/dashboard/expenses",
      }).catch(() => {});
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useApproveExpense() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) =>
      expenseService.approveExpense(expenseId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all });
      const t = getT();
      toast.success(t.toasts.expenseApproved);
      notificationService.createNotification({
        user_id: user!.id,
        mess_id: activeMess?.id,
        type: "expense_approved",
        title: t.toasts.expenseApprovedNotif,
        body: t.toasts.expenseApprovedNotifBody,
        action_url: "/dashboard/expenses",
      }).catch(() => {});
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => expenseService.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all });
      toast.success(getT().toasts.expenseCancelled);
    },
    onError: (error: Error) => toast.error(error.message),
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
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all });
      toast.success(getT().toasts.bazaarAdded);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
