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

      // Fetch all existing meals for this month once
      const monthMeals = await mealService.getMonthlyMeals(activeMess!.id, memberId, activeMonth);
      const vacationDates = new Set(
        monthMeals.filter((m) => m.vacation_id != null).map((m) => m.date)
      );

      // Future dates: apply defaults per slot, starting from each slot's calculated start date.
      // slotStartDates is always tomorrow or day-after-tomorrow (never today) from settings page.
      // Rules:
      //   • Vacation dates → always skipped
      //   • Manual OFF (false) → preserved per slot
      //   • date < slotStartDate for a slot → that slot is still locked; preserve existing value
      const futureDays = getDaysInMonth(activeMonth).filter((d) => d > today);
      for (const date of futureDays) {
        if (vacationDates.has(date)) continue;

        const existing = monthMeals.find((m) => m.date === date);

        const bApply = date >= slotStartDates.breakfast;
        const lApply = date >= slotStartDates.lunch;
        const dApply = date >= slotStartDates.dinner;

        // Skip entirely if no slot applies to this date
        if (!bApply && !lApply && !dApply) continue;

        await mealService.upsertMeal(
          activeMess!.id,
          memberId,
          {
            date,
            // Per-slot logic:
            //   slot applies & existing is not manually OFF → use new default
            //   slot applies & existing is manually OFF     → preserve OFF
            //   slot not yet applicable (locked)            → preserve existing (default true)
            breakfast: bApply ? (existing?.breakfast === false ? false : defaults.breakfast) : (existing?.breakfast ?? true),
            lunch:     lApply ? (existing?.lunch     === false ? false : defaults.lunch)     : (existing?.lunch     ?? true),
            dinner:    dApply ? (existing?.dinner    === false ? false : defaults.dinner)    : (existing?.dinner    ?? true),
          },
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
