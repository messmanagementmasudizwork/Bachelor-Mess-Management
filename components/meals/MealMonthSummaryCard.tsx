"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BarChart3, UtensilsCrossed, Users, TrendingDown, Coffee, Sun, Moon, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMonth, getTodayString, getDaysInMonth, prevMonth, nextMonth, getCurrentMonthString } from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/lib/types";

interface Props {
  myMeals: MealEntry[];
  activeMonth: string;
  isLoading?: boolean;
  // Analytics props
  analyticsMyMeals?: MealEntry[];
  analyticsViewMonth?: string;
  setAnalyticsViewMonth?: (m: string) => void;
  analyticsJoiningDate?: string;
  analyticsIsLoading?: boolean;
}

function MealTypeRow({ icon, label, count, unit, color }: {
  icon: React.ReactNode; label: string; count: number; unit: string; color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", color)}>
        {count} {unit}
      </span>
    </div>
  );
}

export function MealMonthSummaryCard({
  myMeals, activeMonth, isLoading,
  analyticsMyMeals, analyticsViewMonth, setAnalyticsViewMonth,
  analyticsJoiningDate, analyticsIsLoading,
}: Props) {
  const { t } = useLanguage();
  const today = getTodayString();
  const [analysisOpen, setAnalysisOpen] = useState(false);

  // ── Monthly Summary stats ─────────────────────────────────
  const stats = useMemo(() => {
    const monthMeals = myMeals.filter((m) => m.date.startsWith(activeMonth));
    const pastAndToday = monthMeals.filter((m) => m.date <= today);
    const future       = monthMeals.filter((m) => m.date > today);
    const count = (list: MealEntry[]) => ({
      breakfast:      list.filter((m) => m.breakfast).length,
      lunch:          list.filter((m) => m.lunch).length,
      dinner:         list.filter((m) => m.dinner).length,
      guest:          list.reduce((s, m) => s + (m.guest_breakfast ?? 0) + (m.guest_lunch ?? 0) + (m.guest_dinner ?? 0), 0),
      offDays:        list.filter((m) => !m.breakfast && !m.lunch && !m.dinner).length,
      vacationOffDays: list.filter((m) => !m.breakfast && !m.lunch && !m.dinner && !!m.vacation_id).length,
      manualOffDays:   list.filter((m) => !m.breakfast && !m.lunch && !m.dinner && !m.vacation_id).length,
    });
    const actual  = count(pastAndToday);
    const planned = count(future);
    const actualTotal  = actual.breakfast  + actual.lunch  + actual.dinner;
    const plannedTotal = planned.breakfast + planned.lunch + planned.dinner;
    const daysInMonth = new Date(parseInt(activeMonth.slice(0, 4)), parseInt(activeMonth.slice(5, 7)), 0).getDate();
    const todayDay   = activeMonth === today.slice(0, 7) ? parseInt(today.slice(8, 10)) : daysInMonth;
    const daysPassed = Math.min(todayDay, daysInMonth);
    const daysLeft   = Math.max(0, daysInMonth - daysPassed);
    const progressPct = Math.round((actualTotal / Math.max(actualTotal + plannedTotal, 1)) * 100);
    return { actual, planned, actualTotal, plannedTotal, daysPassed, daysLeft, progressPct };
  }, [myMeals, activeMonth, today]);

  // ── Analytics stats ───────────────────────────────────────
  const analytics = useMemo(() => {
    if (!analyticsMyMeals || !analyticsViewMonth) return null;
    const allMonthDays = getDaysInMonth(analyticsViewMonth);
    const effectiveStart = analyticsJoiningDate && analyticsJoiningDate > allMonthDays[0]!
      ? analyticsJoiningDate : allMonthDays[0]!;
    const monthDays  = allMonthDays.filter((d) => d >= effectiveStart);
    const monthMeals = analyticsMyMeals.filter((m) => monthDays.includes(m.date));
    const totalDays  = monthDays.length;
    const elapsedDays = Math.max(monthDays.filter((d) => d <= today).length, 1);
    const pastMeals  = monthMeals.filter((m) => m.date <= today);
    const onDays     = pastMeals.filter((m) => m.breakfast || m.lunch || m.dinner).length;
    const bfOn       = pastMeals.filter((m) => m.breakfast).length;
    const luOn       = pastMeals.filter((m) => m.lunch).length;
    const diOn       = pastMeals.filter((m) => m.dinner).length;
    const guestTotal = pastMeals.reduce((s, m) => s + (m.guest_breakfast ?? 0) + (m.guest_lunch ?? 0) + (m.guest_dinner ?? 0), 0);
    const totalMeals = bfOn + luOn + diOn;
    const pct        = Math.round((onDays / elapsedDays) * 100);
    return { totalMeals, onDays, elapsedDays, totalDays, pct, guestTotal, bfOn, luOn, diOn };
  }, [analyticsMyMeals, analyticsViewMonth, analyticsJoiningDate, today]);

  const mealIcons = [
    { icon: <Coffee className="h-3.5 w-3.5 text-amber-500" />, label: t.meals.breakfast, color: "text-amber-700 bg-amber-50" },
    { icon: <Sun    className="h-3.5 w-3.5 text-blue-500"  />, label: t.meals.lunch,      color: "text-blue-700 bg-blue-50"   },
    { icon: <Moon   className="h-3.5 w-3.5 text-indigo-500"/>, label: t.meals.dinner,     color: "text-indigo-700 bg-indigo-50"},
  ];
  const actualCounts  = [stats.actual.breakfast,  stats.actual.lunch,  stats.actual.dinner];
  const plannedCounts = [stats.planned.breakfast, stats.planned.lunch, stats.planned.dinner];

  const analyticsBars = analytics ? [
    { label: t.meals.breakfast, count: analytics.bfOn,  color: "bg-amber-400", emoji: "🌅" },
    { label: t.meals.lunch,     count: analytics.luOn,  color: "bg-blue-400",  emoji: "☀️" },
    { label: t.meals.dinner,    count: analytics.diOn,  color: "bg-indigo-500",emoji: "🌙" },
  ] : [];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">{t.meals.monthSummaryTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{formatMonth(activeMonth)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold leading-none">
              {stats.actualTotal}
              <span className="text-base font-normal text-muted-foreground">/{stats.actualTotal + stats.plannedTotal}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.meals.totalMealsCount}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{stats.daysPassed} {t.meals.daysPassedUnit}</span>
                <span>{stats.daysLeft} {t.meals.daysLeftUnit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                  style={{ width: `${stats.progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-green-600 font-semibold">{stats.actualTotal} {t.meals.actualMealsLabel}</span>
                <span className="text-blue-500 font-medium">{stats.plannedTotal} {t.meals.plannedMealsLabel}</span>
              </div>
            </div>

            {/* Two-column breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {/* Actual */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[11px] font-semibold text-green-700">{t.meals.actualUpToday}</span>
                </div>
                {mealIcons.map(({ icon, label, color }, i) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {icon}<span>{label}</span>
                    </div>
                    <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-full", color)}>
                      {actualCounts[i]}
                    </span>
                  </div>
                ))}
                <div className="border-t border-green-200 pt-1 mt-1 space-y-1">
                  {stats.actual.vacationOffDays > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="text-[10px]">🏖️</span><span>{t.meals.vacationOffDays}</span>
                      </div>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-blue-700 bg-blue-50">
                        {stats.actual.vacationOffDays}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <TrendingDown className="h-3 w-3 text-red-400" /><span>{t.meals.offDaysCount}</span>
                    </div>
                    <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                      stats.actual.manualOffDays > 0 ? "text-red-700 bg-red-50" : "text-green-700 bg-green-100")}>
                      {stats.actual.manualOffDays}
                    </span>
                  </div>
                  {stats.actual.guest > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3 text-purple-400" /><span>{t.meals.guestMealsCount}</span>
                      </div>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-purple-700 bg-purple-50">
                        {stats.actual.guest}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-green-300 pt-1 mt-1">
                    <span className="text-[11px] font-semibold text-green-700">Total</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-green-800 bg-green-200">
                      {stats.actualTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Planned */}
              <div className={cn("rounded-xl border p-2.5 space-y-1.5",
                stats.daysLeft === 0 ? "border-gray-200 bg-gray-50 opacity-60" : "border-blue-200 bg-blue-50")}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] font-semibold text-blue-600">{t.meals.plannedRemaining}</span>
                </div>
                {stats.daysLeft === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">{t.meals.monthEnded}</p>
                ) : (
                  <>
                    {mealIcons.map(({ icon, label }, i) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          {icon}<span>{label}</span>
                        </div>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-blue-700 bg-blue-100">
                          {plannedCounts[i]}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-blue-200 pt-1 mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TrendingDown className="h-3 w-3 text-red-400" /><span>{t.meals.offDaysCount}</span>
                        </div>
                        <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                          stats.planned.offDays > 0 ? "text-red-700 bg-red-50" : "text-blue-700 bg-blue-100")}>
                          {stats.planned.offDays}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-blue-300 pt-1 mt-1">
                        <span className="text-[11px] font-semibold text-blue-700">Total</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-blue-800 bg-blue-200">
                          {stats.plannedTotal}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {stats.actualTotal === 0 && stats.plannedTotal === 0 && (
              <p className="text-center text-xs text-muted-foreground py-2">{t.meals.noMealData}</p>
            )}

            {/* ── Analysis Section (collapsible) ─────────────── */}
            {analyticsViewMonth && setAnalyticsViewMonth && (
              <div className="border-t pt-3 space-y-3">
                {/* Clickable header — toggles collapse */}
                <button
                  type="button"
                  onClick={() => setAnalysisOpen((o) => !o)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">{t.meals.mealAnalysis} {formatMonth(analyticsViewMonth)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {analysisOpen && (
                      <>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setAnalyticsViewMonth(prevMonth(analyticsViewMonth)); }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setAnalyticsViewMonth(nextMonth(analyticsViewMonth)); }}
                          disabled={analyticsViewMonth >= getCurrentMonthString()}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors ml-1">
                      {analysisOpen
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                </button>

                {analysisOpen && (
                  analyticsIsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
                    </div>
                  ) : !analytics || analytics.totalMeals === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-3">{t.meals.noMealData}</p>
                  ) : (
                    <>
                      {/* 4 stat boxes */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-center border border-primary/10">
                          <p className="text-xl font-bold text-primary">{analytics.totalMeals}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.meals.totalMealsCount}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-green-50 text-center border border-green-100">
                          <p className="text-xl font-bold text-green-700">{analytics.onDays}/{analytics.elapsedDays}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.meals.activeDays}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 text-center border border-amber-100">
                          <p className="text-xl font-bold text-amber-700">{analytics.pct}%</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.meals.attendanceRate}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-50 text-center border border-purple-100">
                          <p className="text-xl font-bold text-purple-700">{analytics.guestTotal}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.meals.guestMealsCount}</p>
                        </div>
                      </div>

                      {/* Meal bars */}
                      <div className="space-y-2">
                        {analyticsBars.map((b) => (
                          <div key={b.label} className="space-y-1">
                            <div className="flex justify-between text-[11px] items-center">
                              <span className="flex items-center gap-1 font-medium">
                                <span>{b.emoji}</span><span>{b.label}</span>
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {t.meals.dayCountFmt.replace("{count}", String(b.count)).replace("{pct}", String(Math.round((b.count / Math.max(analytics.totalDays, 1)) * 100)))}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-700", b.color)}
                                style={{ width: `${(b.count / Math.max(analytics.totalDays, 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
