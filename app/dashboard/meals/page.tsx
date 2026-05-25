"use client";
import { useState, useEffect } from "react";
import { useMyMeals, useUpdateMeal, MEAL_KEYS } from "@/lib/hooks/use-meals";
import { useQueryClient } from "@tanstack/react-query";
import { mealService } from "@/lib/services/meal.service";
import { useMyMembership } from "@/lib/hooks/use-members";
import { useMessStore } from "@/lib/stores/mess.store";
import { useMess } from "@/lib/hooks/use-mess";
import { getTodayString } from "@/lib/utils/date";
import { MealLeaveSection } from "@/components/meals/MealLeaveSection";
import { MealMonthSummaryCard } from "@/components/meals/MealMonthSummaryCard";
import { TodayHeroSection } from "@/components/meals/TodayHeroSection";
import { TomorrowMealSection } from "@/components/meals/TomorrowMealSection";
import { MealCalendarTab } from "@/components/meals/MealCalendarTab";
import { AccountFrozenBanner } from "@/components/members/AccountFrozenBanner";
import { checkMealToggleAllowed } from "@/lib/utils/meal-cutoff";
import { computeViolationStatus } from "@/lib/utils/leave-violation";
import { useSyncViolationStatus } from "@/lib/hooks/use-reactivation";
import { useVacations } from "@/lib/hooks/use-vacation";
import { getDatesInRange } from "@/lib/utils/date-range";
import type { MessSettings, AccountStatus } from "@/lib/types";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

type GuestKey = "guest_breakfast" | "guest_lunch" | "guest_dinner";

export default function MealsPage() {
  const { t } = useLanguage();
  const { activeMess, activeMonth } = useMessStore();
  const { data: myMembership } = useMyMembership();
  const { data: mess } = useMess(activeMess?.id);
  const today = getTodayString();
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toISOString()
    .split("T")[0]!;
  const [viewMonth, setViewMonth] = useState(activeMonth);

  const { data: myMeals, isLoading } = useMyMeals(myMembership?.id);
  const { data: viewMonthMeals, isLoading: calendarLoading } = useMyMeals(myMembership?.id, viewMonth, false);
  const { data: vacations } = useVacations();
  const updateMeal = useUpdateMeal(myMembership?.id);
  const syncViolation = useSyncViolationStatus();

  const queryClient = useQueryClient();
  const messSettings = (mess?.mess_settings ?? {}) as Partial<MessSettings>;
  const myRole = activeMess?.role as import("@/lib/types").MemberRole | undefined;
  const joiningDate = myMembership?.joining_date as string | undefined;
  const maxLeaveDays = messSettings.max_meal_leave_days ?? 90;

  const mealDefaults = {
    breakfast: myMembership?.meal_default_breakfast ?? true,
    lunch:     myMembership?.meal_default_lunch     ?? true,
    dinner:    myMembership?.meal_default_dinner    ?? true,
  };

  const storedAccountStatus = (myMembership?.account_status ?? "active") as AccountStatus;
  const openLeaveStarted = myMembership?.open_leave_started as string | null | undefined;

  const violation = computeViolationStatus(openLeaveStarted ?? null, maxLeaveDays, storedAccountStatus);
  const accountStatus = violation.status;

  useEffect(() => {
    if (!myMembership?.id) return;
    if (violation.status !== storedAccountStatus) {
      syncViolation.mutate({
        memberId: myMembership.id,
        newStatus: violation.status,
        violationSince: violation.violationSince,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMembership?.id, violation.status]);

  // Auto-seed today/tomorrow with member defaults if no entry exists yet
  useEffect(() => {
    if (!myMembership?.id || !activeMess?.id || !myMeals || isLoading) return;

    const datesToSeed = [today, tomorrow].filter((date) => {
      if (myMeals.find((m) => m.date === date)) return false;
      return (
        checkMealToggleAllowed("breakfast", date, myRole, messSettings, joiningDate).allowed ||
        checkMealToggleAllowed("lunch",     date, myRole, messSettings, joiningDate).allowed ||
        checkMealToggleAllowed("dinner",    date, myRole, messSettings, joiningDate).allowed
      );
    });

    if (datesToSeed.length === 0) return;

    const seed = async () => {
      for (const date of datesToSeed) {
        await mealService.upsertMeal(
          activeMess.id,
          myMembership.id,
          { date, breakfast: mealDefaults.breakfast, lunch: mealDefaults.lunch, dinner: mealDefaults.dinner },
          myMembership.user_id
        );
      }
      queryClient.invalidateQueries({ queryKey: MEAL_KEYS.all });
    };
    seed().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMembership?.id, activeMess?.id, isLoading]);

  const getMealForDate = (date: string) => myMeals?.find((m) => m.date === date);
  const getViewMealForDate = (date: string) => viewMonthMeals?.find((m) => m.date === date);

  // Build a Set of vacation dates for the currently-viewed month so the
  // calendar can mark them even when no meal entry exists in the DB
  // (bulkTurnOffMeals only applies to d >= today, so past vacation dates
  //  may have no meal entry at all).
  const vacationDatesForMonth = new Set<string>(
    (vacations ?? []).flatMap((v) => getDatesInRange(v.start_date, v.end_date))
      .filter((d) => d.startsWith(viewMonth))
  );

  const handleTomorrowToggle = async (type: "breakfast" | "lunch" | "dinner", current: boolean) => {
    if (accountStatus !== "active") {
      toast.error(t.violations.mealBlocked); return;
    }
    const check = checkMealToggleAllowed(type, tomorrow, myRole, messSettings, joiningDate);
    if (!check.allowed) { toast.error(check.reason ?? t.meals.cannotChangeMeal); return; }
    if (check.isLate && check.reason) toast.warning(check.reason);
    const meal = getMealForDate(tomorrow);
    await updateMeal.mutateAsync({
      date: tomorrow,
      breakfast: type === "breakfast" ? !current : (meal?.breakfast ?? mealDefaults.breakfast),
      lunch:     type === "lunch"     ? !current : (meal?.lunch     ?? mealDefaults.lunch),
      dinner:    type === "dinner"    ? !current : (meal?.dinner    ?? mealDefaults.dinner),
    });
  };

  const handleGuestChange = async (key: GuestKey, delta: number) => {
    const meal = getMealForDate(tomorrow);
    const current = meal?.[key] ?? 0;
    const next = Math.max(0, current + delta);
    await updateMeal.mutateAsync({
      date: tomorrow,
      breakfast: meal?.breakfast ?? mealDefaults.breakfast,
      lunch:     meal?.lunch     ?? mealDefaults.lunch,
      dinner:    meal?.dinner    ?? mealDefaults.dinner,
      guest_breakfast: key === "guest_breakfast" ? next : (meal?.guest_breakfast ?? 0),
      guest_lunch:     key === "guest_lunch"     ? next : (meal?.guest_lunch     ?? 0),
      guest_dinner:    key === "guest_dinner"    ? next : (meal?.guest_dinner    ?? 0),
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {accountStatus !== "active" && myMembership?.id && activeMess?.id && (
        <AccountFrozenBanner
          status={accountStatus}
          messId={activeMess.id}
          memberId={myMembership.id}
          excessDays={violation.excessDays}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

        <TodayHeroSection todayMeal={getMealForDate(today)} mealDefaults={mealDefaults} />

        <TomorrowMealSection
          tomorrowMeal={getMealForDate(tomorrow)}
          tomorrow={tomorrow}
          messSettings={messSettings}
          myRole={myRole}
          isPending={updateMeal.isPending}
          joiningDate={joiningDate}
          onToggle={handleTomorrowToggle}
          onGuestChange={myMembership?.id ? handleGuestChange : undefined}
          isGuestPending={updateMeal.isPending}
          mealDefaults={mealDefaults}
        />

        <MealLeaveSection
          messSettings={messSettings}
          myRole={myRole}
          memberId={myMembership?.id}
          joiningDate={joiningDate}
          accountStatus={accountStatus}
          mealDefaults={mealDefaults}
          getMealForDate={getMealForDate}
          onUpdate={(input) =>
            mealService.upsertMeal(activeMess!.id, myMembership!.id, input, myMembership!.user_id)
          }
          isPending={updateMeal.isPending}
        />

        <MealMonthSummaryCard
          myMeals={myMeals ?? []}
          activeMonth={activeMonth}
          isLoading={isLoading}
          analyticsMyMeals={viewMonthMeals ?? []}
          analyticsViewMonth={viewMonth}
          setAnalyticsViewMonth={setViewMonth}
          analyticsJoiningDate={joiningDate}
          analyticsIsLoading={calendarLoading}
        />

      </div>

      {/* Full-width Calendar — always visible, no tab switcher */}
      <MealCalendarTab
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        getMealForDate={getViewMealForDate}
        isLoading={calendarLoading}
        joiningDate={joiningDate}
        vacationDates={vacationDatesForMonth}
      />

    </div>
  );
}
