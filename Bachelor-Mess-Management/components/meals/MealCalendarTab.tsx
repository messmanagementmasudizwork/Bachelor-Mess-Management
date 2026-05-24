"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import {
  getDaysInMonth, getTodayString, formatMonth,
  prevMonth, nextMonth, getCurrentMonthString,
} from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/lib/types";

interface Props {
  viewMonth: string;
  setViewMonth: (m: string) => void;
  getMealForDate: (date: string) => MealEntry | undefined;
  isLoading: boolean;
  joiningDate?: string;
}

export function MealCalendarTab({ viewMonth, setViewMonth, getMealForDate, isLoading, joiningDate }: Props) {
  const { t } = useLanguage();
  const today = getTodayString();
  const days = getDaysInMonth(viewMonth);
  const dayLabels = [t.meals.days.sun, t.meals.days.mon, t.meals.days.tue, t.meals.days.wed, t.meals.days.thu, t.meals.days.fri, t.meals.days.sat];

  const pastDays = days.filter((d) => d <= today && (!joiningDate || d >= joiningDate));
  const mealOnDays = pastDays.filter((d) => {
    const m = getMealForDate(d);
    return m ? (m.breakfast || m.lunch || m.dinner) : true;
  }).length;
  const pct = pastDays.length > 0 ? Math.round((mealOnDays / pastDays.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t.meals.monthlyCalendar}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(prevMonth(viewMonth))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[90px] text-center">{formatMonth(viewMonth)}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMonth(nextMonth(viewMonth))} disabled={viewMonth >= getCurrentMonthString()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        {isLoading ? <CardLoader /> : (
          <>
            <div className="grid grid-cols-7 mb-1">
              {dayLabels.map((d) => (
                <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: new Date(days[0] + "T00:00:00").getDay() }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {days.map((date) => {
                const meal = getMealForDate(date);
                const isToday = date === today;
                const isFuture = date > today;
                const isBeforeJoining = !!joiningDate && date < joiningDate;
                const dayNum = new Date(date + "T00:00:00").getDate();
                const bfOn = meal?.breakfast ?? true;
                const luOn = meal?.lunch ?? true;
                const diOn = meal?.dinner ?? true;
                const allOff = !!meal && !bfOn && !luOn && !diOn;
                const someOff = !!meal && (!bfOn || !luOn || !diOn) && !allOff;
                const allOn = !!meal && bfOn && luOn && diOn;

                if (isBeforeJoining) {
                  return (
                    <div
                      key={date}
                      title={t.meals.calendarBeforeJoining}
                      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 bg-muted/20 py-1.5 opacity-40"
                    >
                      <span className="text-[11px] font-medium leading-none text-muted-foreground line-through">
                        {dayNum}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={date}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border transition-all py-1.5",
                      isToday && "border-primary ring-2 ring-primary/20 bg-primary/5",
                      !isToday && allOff && "border-red-200 bg-red-50/70",
                      !isToday && someOff && "border-amber-200 bg-amber-50/50",
                      !isToday && allOn && "border-green-200 bg-green-50/40",
                      !isToday && !meal && "border-border/40",
                      isFuture && !isToday && "opacity-55"
                    )}
                  >
                    <span className={cn(
                      "text-[11px] font-bold leading-none",
                      isToday ? "text-primary" : allOff ? "text-red-600" : allOn ? "text-green-700" : "text-foreground"
                    )}>
                      {dayNum}
                    </span>
                    {meal && (
                      <div className="flex gap-0.5 mt-1">
                        {[bfOn, luOn, diOn].map((on, i) => (
                          <div key={i} className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-green-500" : "bg-red-400")} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pastDays.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{t.meals.calendarMealStats.replace("{mealDays}", String(mealOnDays)).replace("{totalDays}", String(pastDays.length))}</span>
                  <span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700",
                      pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
              {[
                { cls: "bg-green-50 border-green-200", label: t.meals.allOn },
                { cls: "bg-amber-50 border-amber-200", label: t.meals.partialOn },
                { cls: "bg-red-50 border-red-200", label: t.meals.allOff },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <div className={cn("h-2.5 w-2.5 rounded-sm border", cls)} />
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
