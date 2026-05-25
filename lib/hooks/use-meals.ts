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
import { getDatesInRange } from "@/lib/utils/date-range";
import { getRequiredClient } from "@/lib/supabase/client";

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
      previousDefaults,
      slotStartDates,
    }: {
      memberId: string;
      defaults: { breakfast: boolean; lunch: boolean; dinner: boolean };
      // OLD defaults before the user changed them — used to detect "manual OFF" vs "seeded OFF"
      previousDefaults: { breakfast: boolean; lunch: boolean; dinner: boolean };
      slotStartDates: { breakfast: string; lunch: string; dinner: string };
    }) => {
      const today = getTodayString();

      // Fetch all existing meals for this month once
      const monthMeals = await mealService.getMonthlyMeals(activeMess!.id, memberId, activeMonth);

      // ──────────────────────────────────────────────────────────────────
      // VACATION DATES: fetch directly from mess_vacations table.
      // We CANNOT rely on vacation_id in meal entries because bulkTurnOffMeals
      // sets vacation_id = null when any meal was already OFF before vacation,
      // which would cause those dates to be incorrectly overwritten.
      // ──────────────────────────────────────────────────────────────────
      const supabase = getRequiredClient();
      const { data: vacationRows } = await supabase
        .from("mess_vacations")
        .select("start_date, end_date")
        .eq("mess_id", activeMess!.id)
        .gte("end_date", today); // only vacations that haven't ended

      const vacationDates = new Set<string>();
      for (const v of (vacationRows ?? [])) {
        for (const d of getDatesInRange(v.start_date, v.end_date)) {
          if (d > today) vacationDates.add(d);
        }
      }

      // Future dates: apply defaults per slot, starting from each slot's calculated start date.
      // slotStartDates is always tomorrow or day-after-tomorrow (never today).
      // Rules:
      //   • Vacation dates                   → ALWAYS skipped (never overwritten)
      //   • Manual OFF (user explicitly off) → preserved per slot
      //   • Seeded OFF (from old default)    → replaced with new default
      //   • date < slotStartDate for a slot  → that slot is still locked; preserve existing
      const futureDays = getDaysInMonth(activeMonth).filter((d) => d > today);

      for (const date of futureDays) {
        // ── 1. Skip vacation-protected dates ──────────────────────────────
        if (vacationDates.has(date)) continue;

        const existing = monthMeals.find((m) => m.date === date);

        const bApply = date >= slotStartDates.breakfast;
        const lApply = date >= slotStartDates.lunch;
        const dApply = date >= slotStartDates.dinner;

        // Skip entirely if no slot applies to this date
        if (!bApply && !lApply && !dApply) continue;

        // ── 2. Smart manual-OFF preservation ─────────────────────────────
        // Only preserve false if the OLD default was ON (true) but existing is OFF (false).
        // That means the user explicitly turned it OFF for that date.
        // If OLD default was OFF and existing is OFF → it was seeded from old default → apply new default.
        const isManualOff = (slot: "breakfast" | "lunch" | "dinner") =>
          existing?.[slot] === false && previousDefaults[slot] === true;

        await mealService.upsertMeal(
          activeMess!.id,
          memberId,
          {
            date,
            breakfast: bApply ? (isManualOff("breakfast") ? false : defaults.breakfast) : (existing?.breakfast ?? true),
            lunch:     lApply ? (isManualOff("lunch")     ? false : defaults.lunch)     : (existing?.lunch     ?? true),
            dinner:    dApply ? (isManualOff("dinner")    ? false : defaults.dinner)    : (existing?.dinner    ?? true),
          },
          user!.id
        );
      }
    },
    onSuccess: () => {
      // refetchType: "all" forces refetch even for unmounted queries (e.g., meals page while on settings)
      // so that when the user navigates to meals page, they see fresh data immediately.
      queryClient.invalidateQueries({ queryKey: MEAL_KEYS.all, refetchType: "all" });
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
