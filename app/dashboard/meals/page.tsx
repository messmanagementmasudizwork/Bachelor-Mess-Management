"use client";
import { useState, useEffect } from "react";
import { useMyMeals, useUpdateMeal } from "@/lib/hooks/use-meals";
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
import { VacationBanner } from "@/components/shared/VacationBanner";
import { checkMealToggleAllowed } from "@/lib/utils/meal-cutoff";
import { computeViolationStatus } from "@/lib/utils/leave-violation";
import { useSyncViolationStatus } from "@/lib/hooks/use-reactivation";
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
  const updateMeal = useUpdateMeal(myMembership?.id);
  const syncViolation = useSyncViolationStatus();

  const messSettings = (mess?.mess_settings ?? {}) as Partial<MessSettings>;
  const myRole = activeMess?.role as import("@/lib/types").MemberRole | undefined;
  const joiningDate = myMembership?.joining_date as string | undefined;
  const maxLeaveDays = messSettings.max_meal_leave_days ?? 90;

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

  const getMealForDate = (date: string) => myMeals?.find((m) => m.date === date);
  const getViewMealForDate = (date: string) => viewMonthMeals?.find((m) => m.date === date);

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
      breakfast: type === "breakfast" ? !current : (meal?.breakfast ?? true),
      lunch: type === "lunch" ? !current : (meal?.lunch ?? true),
      dinner: type === "dinner" ? !current : (meal?.dinner ?? true),
    });
  };

  const handleGuestChange = async (key: GuestKey, delta: number) => {
    const meal = getMealForDate(tomorrow);
    const current = meal?.[key] ?? 0;
    const next = Math.max(0, current + delta);
    await updateMeal.mutateAsync({
      date: tomorrow,
      breakfast: meal?.breakfast ?? true,
      lunch: meal?.lunch ?? true,
      dinner: meal?.dinner ?? true,
      guest_breakfast: key === "guest_breakfast" ? next : (meal?.guest_breakfast ?? 0),
      guest_lunch:     key === "guest_lunch"     ? next : (meal?.guest_lunch     ?? 0),
      guest_dinner:    key === "guest_dinner"    ? next : (meal?.guest_dinner    ?? 0),
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">

      <VacationBanner />

      {accountStatus !== "active" && myMembership?.id && activeMess?.id && (
        <AccountFrozenBanner
          status={accountStatus}
          messId={activeMess.id}
          memberId={myMembership.id}
          excessDays={violation.excessDays}
        />
      )}

      {/* 2x2 grid — MealMonthSummaryCard now includes Analytics at the bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

        <TodayHeroSection todayMeal={getMealForDate(today)} />

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
        />

        <MealLeaveSection
          messSettings={messSettings}
          myRole={myRole}
          memberId={myMembership?.id}
          joiningDate={joiningDate}
          accountStatus={accountStatus}
          getMealForDate={getMealForDate}
          onUpdate={(input) => updateMeal.mutateAsync(input)}
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
      />

    </div>
  );
}
