"use client";
import { useState, useEffect } from "react";
import { Check, X, Clock, CalendarDays, Users, Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCutoffDisplay, getCutoffDeadlineText, checkMealToggleAllowed, getCutoffDeadlineMs, getCutoffDeadlineMsForSlot } from "@/lib/utils/meal-cutoff";
import { formatDate } from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";
import type { MessSettings, MealEntry, MemberRole } from "@/lib/types";

const MEAL_EMOJIS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" } as const;

type GuestKey = "guest_breakfast" | "guest_lunch" | "guest_dinner";

/* ── Countdown helpers ───────────────────────────────────────── */
interface Remaining { days: number; hours: number; minutes: number; seconds: number; passed: boolean }

function calcRemaining(deadlineMs: number | null): Remaining {
  if (deadlineMs === null) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  const diff = deadlineMs - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  const totalSec = Math.floor(diff / 1000);
  return {
    days:    Math.floor(totalSec / 86400),
    hours:   Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    passed:  false,
  };
}

function useCountdown(deadlineMs: number | null): Remaining {
  const [remaining, setRemaining] = useState<Remaining>(() => calcRemaining(deadlineMs));
  useEffect(() => {
    if (deadlineMs === null) return;
    setRemaining(calcRemaining(deadlineMs));
    const id = setInterval(() => setRemaining(calcRemaining(deadlineMs)), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);
  return remaining;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function CountdownBadge({ deadlineMs }: { deadlineMs: number | null }) {
  const r = useCountdown(deadlineMs);
  if (deadlineMs === null) return null;

  if (r.passed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
        <Clock className="h-2.5 w-2.5" />
        Cutoff passed
      </span>
    );
  }

  const isUrgent = r.days === 0 && r.hours < 1;
  const isWarning = r.days === 0 && r.hours < 3;

  const timeStr = r.days > 0
    ? `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
    : `${pad(r.hours)}h ${pad(r.minutes)}m ${pad(r.seconds)}s`;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors",
      isUrgent
        ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
        : isWarning
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      <Clock className="h-2.5 w-2.5 shrink-0" />
      {timeStr}
    </span>
  );
}

type ColorKey = "amber" | "blue" | "indigo";
const colorMap: Record<ColorKey, { bg: string; text: string; btn: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", btn: "border-amber-200 hover:bg-amber-100" },
  blue:  { bg: "bg-blue-50",  text: "text-blue-700",  btn: "border-blue-200 hover:bg-blue-100"  },
  indigo:{ bg: "bg-indigo-50",text: "text-indigo-700",btn: "border-indigo-200 hover:bg-indigo-100"},
};

interface Props {
  tomorrowMeal: MealEntry | undefined;
  tomorrow: string;
  messSettings: Partial<MessSettings>;
  myRole: MemberRole | undefined;
  isPending: boolean;
  joiningDate?: string;
  onToggle: (type: "breakfast" | "lunch" | "dinner", current: boolean) => void;
  onGuestChange?: (key: GuestKey, delta: number) => Promise<void>;
  isGuestPending?: boolean;
}

export function TomorrowMealSection({
  tomorrowMeal, tomorrow, messSettings, myRole, isPending, joiningDate, onToggle,
  onGuestChange, isGuestPending,
}: Props) {
  const { t } = useLanguage();
  const { formatDatePref } = usePreferences();
  const [guestOpen, setGuestOpen] = useState(false);

  const mealTypes = [
    { key: "breakfast" as const, label: t.meals.breakfast },
    { key: "lunch" as const, label: t.meals.lunch },
    { key: "dinner" as const, label: t.meals.dinner },
  ];

  const guestTypes = [
    { key: "guest_breakfast" as const, label: t.meals.breakfast, color: "amber" as ColorKey },
    { key: "guest_lunch"    as const, label: t.meals.lunch,      color: "blue"  as ColorKey },
    { key: "guest_dinner"   as const, label: t.meals.dinner,     color: "indigo"as ColorKey },
  ];

  const getGuest = (key: GuestKey) => tomorrowMeal?.[key] ?? 0;
  const totalGuest = getGuest("guest_breakfast") + getGuest("guest_lunch") + getGuest("guest_dinner");

  const daysBeforeCutoff = messSettings.cutoff_days_before ?? 0;
  const cutoffMode = messSettings.cutoff_time_mode ?? "per_meal";
  const deadlineMs = daysBeforeCutoff > 0 ? getCutoffDeadlineMs(tomorrow, messSettings) : null;

  const guestBusy = isPending || (isGuestPending ?? false);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">{t.meals.tomorrowMealsTitle}</p>
              <p className="text-xs text-muted-foreground">{formatDatePref(tomorrow)}</p>
            </div>
          </div>
          {deadlineMs !== null && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground font-medium leading-none">
                {getCutoffDeadlineText(tomorrow, messSettings).split(" ").slice(0, -1).join(" ")}
              </span>
              <CountdownBadge deadlineMs={deadlineMs} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Meal toggles */}
        <div className="grid grid-cols-3 gap-2">
          {mealTypes.map((type) => {
            const isOn = tomorrowMeal ? tomorrowMeal[type.key] : true;
            const check = checkMealToggleAllowed(type.key, tomorrow, "member", messSettings, joiningDate);
            const locked = !check.allowed;
            const cutoffTime = getCutoffDisplay(type.key, messSettings);
            const slotDeadlineMs = cutoffMode === "per_meal" && daysBeforeCutoff > 0
              ? getCutoffDeadlineMsForSlot(type.key, tomorrow, messSettings)
              : null;

            return (
              <button
                key={type.key}
                onClick={() => !locked && onToggle(type.key, isOn)}
                disabled={isPending || locked}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 select-none min-h-[96px] justify-center",
                  locked
                    ? "bg-muted/40 border-border text-muted-foreground cursor-not-allowed opacity-60"
                    : isOn
                    ? "bg-green-50 border-green-300 text-green-800 shadow-sm hover:bg-green-100"
                    : "bg-red-50 border-red-300 text-red-700 shadow-sm hover:bg-red-100"
                )}
              >
                <span className="text-2xl leading-none select-none">{MEAL_EMOJIS[type.key]}</span>
                <span className="text-xs font-bold">{type.label}</span>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  locked
                    ? "bg-muted text-muted-foreground"
                    : isOn ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                )}>
                  {locked
                    ? <Clock className="h-2.5 w-2.5" />
                    : isOn ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  <span>{locked ? cutoffTime : isOn ? t.meals.mealOn : t.meals.mealOff}</span>
                </div>
                {slotDeadlineMs !== null && (
                  <CountdownBadge deadlineMs={slotDeadlineMs} />
                )}
              </button>
            );
          })}
        </div>


        {/* Guest meal collapsible — only show if handler provided */}
        {onGuestChange && (
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setGuestOpen((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                {t.meals.guestMealTitle}
              </span>
              <div className="flex items-center gap-2">
                {totalGuest > 0 && (
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {t.meals.guestMealTotal.replace("{count}", String(totalGuest))}
                  </span>
                )}
                {guestOpen
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {guestOpen && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">{t.meals.guestMealNote}</p>
                <div className="grid grid-cols-3 gap-2">
                  {guestTypes.map(({ key, label, color }) => {
                    const c = colorMap[color];
                    const count = getGuest(key);
                    return (
                      <div
                        key={key}
                        className={cn("rounded-xl p-3 flex flex-col items-center gap-2", c.bg)}
                      >
                        <p className={cn("text-xs font-semibold", c.text)}>{label}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn("h-7 w-7 rounded-full", c.btn)}
                            onClick={() => onGuestChange(key, -1)}
                            disabled={count === 0 || guestBusy}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className={cn("text-xl font-bold min-w-[2ch] text-center", c.text)}>
                            {count}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn("h-7 w-7 rounded-full", c.btn)}
                            onClick={() => onGuestChange(key, 1)}
                            disabled={guestBusy}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalGuest === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t.meals.noGuestToday}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
