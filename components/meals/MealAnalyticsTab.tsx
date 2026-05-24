"use client";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDaysInMonth, formatMonth, getCurrentMonthString, getTodayString, prevMonth, nextMonth } from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/lib/types";

interface Props {
  myMeals: MealEntry[];
  isLoading: boolean;
  viewMonth: string;
  setViewMonth: (m: string) => void;
  joiningDate?: string;
}

export function MealAnalyticsTab({ myMeals, isLoading, viewMonth, setViewMonth, joiningDate }: Props) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const today = getTodayString();
  const allMonthDays = getDaysInMonth(viewMonth);

  // Only count days from joining date onward
  const effectiveStart = joiningDate && joiningDate > allMonthDays[0]!
    ? joiningDate
    : allMonthDays[0]!;
  const monthDays = allMonthDays.filter((d) => d >= effectiveStart);

  const monthMeals = myMeals.filter((m) => monthDays.includes(m.date));

  if (monthMeals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t.meals.mealAnalysis} {formatMonth(viewMonth)}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(prevMonth(viewMonth))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(nextMonth(viewMonth))} disabled={viewMonth >= getCurrentMonthString()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          {t.meals.noMealData}
        </CardContent>
      </Card>
    );
  }

  // Total eligible days in the month (from joining date, all days including future)
  const totalDays = monthDays.length;

  // Elapsed days: from joining date up to today (never exceeds totalDays)
  const elapsedDays = Math.max(monthDays.filter((d) => d <= today).length, 1);

  // Only count PAST meals (date <= today) to avoid future pre-set records inflating numbers
  const pastMeals = monthMeals.filter((m) => m.date <= today);

  const onDays = pastMeals.filter((m) => m.breakfast || m.lunch || m.dinner).length;
  const bfOn = pastMeals.filter((m) => m.breakfast).length;
  const luOn = pastMeals.filter((m) => m.lunch).length;
  const diOn = pastMeals.filter((m) => m.dinner).length;
  const guestTotal = pastMeals.reduce(
    (s, m) => s + (m.guest_breakfast ?? 0) + (m.guest_lunch ?? 0) + (m.guest_dinner ?? 0),
    0
  );
  const totalMeals = bfOn + luOn + diOn;
  const bars = [
    { label: t.meals.breakfast, count: bfOn, color: "bg-amber-400", emoji: "🌅" },
    { label: t.meals.lunch, count: luOn, color: "bg-blue-400", emoji: "☀️" },
    { label: t.meals.dinner, count: diOn, color: "bg-indigo-500", emoji: "🌙" },
  ];
  const topMeal = bars.reduce((a, b) => (a.count > b.count ? a : b));
  // onDays/elapsedDays — both capped at today, so result is always 0–100%
  const pct = Math.round((onDays / elapsedDays) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t.meals.mealAnalysis} {formatMonth(viewMonth)}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(prevMonth(viewMonth))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(nextMonth(viewMonth))} disabled={viewMonth >= getCurrentMonthString()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-primary/10 text-center border border-primary/10">
            <p className="text-2xl font-bold text-primary">{totalMeals}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.meals.totalMealsCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-center border border-green-100">
            <p className="text-2xl font-bold text-green-700">{onDays}/{totalDays}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.meals.activeDays}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-center border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{pct}%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.meals.attendanceRate}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-center border border-purple-100">
            <p className="text-2xl font-bold text-purple-700">{guestTotal}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.meals.guestMealsCount}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t.meals.byMealAnalysis}
          </p>
          {bars.map((b) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex justify-between text-xs items-center">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>{b.emoji}</span>
                  <span>{b.label}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {b.count} দিন ({Math.round((b.count / totalDays) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", b.color)}
                  style={{ width: `${(b.count / totalDays) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-muted/50 border space-y-1.5">
          <p className="text-xs">
            📊 {t.meals.avgPerDay}{" "}
            <span className="font-semibold text-foreground">
              {(totalMeals / Math.max(onDays, 1)).toFixed(1)} {t.meals.sessionsUnit}
            </span>
          </p>
          <p className="text-xs">
            🏆 {t.meals.mostFrequent}{" "}
            <span className="font-semibold text-foreground">
              {topMeal.emoji} {topMeal.label}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
