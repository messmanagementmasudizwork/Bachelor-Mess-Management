"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealService } from "@/lib/services/meal.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { useRealtimeInvalidation } from "./use-realtime";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { UpdateMealInput } from "@/lib/types";
import { getTodayString, getDaysInMonth } from "@/lib/utils/date";

export const MEAL_KEYS = {
  all: ["meals"] as const,
  calendar: (messId: string, memberId: string, month: string) =>
    [...MEAL_KEYS.all, "calendar", messId, memberId, month] as const,
  today: (messId: string, memberId: string) =>
    [...MEAL_KEYS.all, "today", messId, memberId] as const,
  allMembers: (messId: string, month: string) =>
    [...MEAL_KEYS.all, "all-members", messId, month] as const,
  daily: (messId: string, date: string) =>
    [...MEAL_KEYS.all, "daily", messId, date] as const,
};

export function useMyMeals(memberId?: string, month?: string, enableRealtime = true) {
  const { activeMess, activeMonth } = useMessStore();
  const targetMonth = month ?? activeMonth;
  useRealtimeInvalidation({
    table: "meals",
    queryKeys: [[...MEAL_KEYS.all]],
    enabled: enableRealtime,
  });
  return useQuery({
    queryKey: MEAL_KEYS.calendar(activeMess?.id!, memberId!, targetMonth),
    queryFn: () => mealService.getMonthlyMeals(activeMess!.id, memberId!, targetMonth),
    enabled: !!activeMess?.id && !!memberId,
  });
}

export function useTodayMeal(memberId?: string) {
  const { activeMess } = useMessStore();
  const today = getTodayString();
  return useQuery({
    queryKey: MEAL_KEYS.today(activeMess?.id!, memberId!),
    queryFn: () => mealService.getMealForDate(activeMess!.id, memberId!, today),
    enabled: !!activeMess?.id && !!memberId,
    refetchInterval: 30000,
  });
}

export function useAllMembersMeals() {
  const { activeMess, activeMonth } = useMessStore();
  return useQuery({
    queryKey: MEAL_KEYS.allMembers(activeMess?.id!, activeMonth),
    queryFn: () => mealService.getAllMembersMonthlyMeals(activeMess!.id, activeMonth),
    enabled: !!activeMess?.id,
  });
}

export function useDailyMealSummary(date: string) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MEAL_KEYS.daily(activeMess?.id!, date),
    queryFn: () => mealService.getDailyMealSummary(activeMess!.id, date),
    enabled: !!activeMess?.id,
  });
}

export function useUpdateMeal(memberId?: string) {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMealInput) =>
      mealService.upsertMeal(activeMess!.id, memberId ?? user!.id, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_KEYS.all });
      toast.success(getT().toasts.mealUpdated);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAdminDailyMeals(date: string) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: [...MEAL_KEYS.all, "admin-daily", activeMess?.id!, date] as const,
    queryFn: () => mealService.getAllMembersForDate(activeMess!.id, date),
    enabled: !!activeMess?.id,
    refetchInterval: 30000,
  });
}

export function useApplyDefaultsToMonth() {
  const { user } = useAuth();
  const { activeMess, activeMonth } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      defaults,
      slotStartDates,
    }: {
      memberId: string;
      defaults: { breakfast: boolean; lunch: boolean; dinner: boolean };
      slotStartDates: { breakfast: string; lunch: string; dinner: string };
    }) => {
      const today = getTodayString();

      // Today: merge with existing entry — only override slots whose cutoff hasn't passed
      const isTodayApplicable =
        slotStartDates.breakfast === today ||
        slotStartDates.lunch === today ||
        slotStartDates.dinner === today;

      if (isTodayApplicable) {
        const existing = await mealService.getMealForDate(activeMess!.id, memberId, today);
        await mealService.upsertMeal(
          activeMess!.id,
          memberId,
          {
            date: today,
            // Unlocked slot (starts today)  → apply new default
            // Locked slot   (starts tomorrow) → preserve existing value;
            //   if no entry yet, fall back to DB default (true) — NOT the new default,
            //   because cutoff has already passed for this slot today.
            breakfast: slotStartDates.breakfast === today ? defaults.breakfast : (existing?.breakfast ?? true),
            lunch:     slotStartDates.lunch     === today ? defaults.lunch     : (existing?.lunch     ?? true),
            dinner:    slotStartDates.dinner    === today ? defaults.dinner    : (existing?.dinner    ?? true),
          },
          user!.id
        );
      }

      // Future dates: apply defaults — but skip vacation-protected dates
      const monthMeals = await mealService.getMonthlyMeals(activeMess!.id, memberId, activeMonth);
      const vacationDates = new Set(
        monthMeals.filter((m) => m.vacation_id != null).map((m) => m.date)
      );

      const futureDays = getDaysInMonth(activeMonth).filter((d) => d > today);
      for (const date of futureDays) {
        if (vacationDates.has(date)) continue; // vacation-set dates are never overwritten
        await mealService.upsertMeal(
          activeMess!.id,
          memberId,
          { date, breakfast: defaults.breakfast, lunch: defaults.lunch, dinner: defaults.dinner },
          user!.id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_KEYS.all });
      toast.success(getT().meals.defaultsApplied);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAdminToggleMeal() {
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdateMealInput }) =>
      mealService.upsertMeal(activeMess!.id, memberId, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_KEYS.all });
      toast.success(getT().toasts.mealUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
