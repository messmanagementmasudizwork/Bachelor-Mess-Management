"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Check, X, AlertTriangle, Plane, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { checkMealToggleAllowed } from "@/lib/utils/meal-cutoff";
import { getTodayString } from "@/lib/utils/date";
import { getDatesInRange, addDays } from "@/lib/utils/date-range";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";
import { useMarkOpenLeave, useClearOpenLeave } from "@/lib/hooks/use-reactivation";
import type { MessSettings, MemberRole, UpdateMealInput, MealEntry, AccountStatus } from "@/lib/types";

type MealSlot = "breakfast" | "lunch" | "dinner";
type OpenPreset = "sick" | "off_until_on" | null;

interface Props {
  messSettings: Partial<MessSettings>;
  myRole: MemberRole | undefined;
  memberId: string | undefined;
  joiningDate?: string;
  accountStatus?: AccountStatus;
  mealDefaults: { breakfast: boolean; lunch: boolean; dinner: boolean };
  getMealForDate: (date: string) => MealEntry | undefined;
  onUpdate: (input: UpdateMealInput) => Promise<void>;
  isPending: boolean;
}

const MEAL_EMOJIS: Record<MealSlot, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
const BATCH_SIZE = 5;
const CONFIRM_THRESHOLD = 7;

export function MealLeaveSection({
  messSettings, myRole, memberId, joiningDate, accountStatus = "active",
  mealDefaults, getMealForDate, onUpdate, isPending,
}: Props) {
  const { t } = useLanguage();
  const today = getTodayString();

  const maxLeaveDays = messSettings.max_meal_leave_days ?? 90;
  const allowOpenLeavePresets = messSettings.allow_open_leave_presets ?? true;

  const markOpenLeave = useMarkOpenLeave();
  const clearOpenLeave = useClearOpenLeave();

  // Block all actions if frozen/banned/closed
  const isAccountBlocked = accountStatus !== "active";

  // ── Refs: always hold the latest prop values so the interval never goes stale ──
  // Problem: messSettings is a new object on every parent render → deps-array change
  // on every render → interval resets every render → 10s timer never fires.
  // Solution: read from refs inside the interval callback; set up interval ONCE.
  const myRoleRef = useRef(myRole);
  const messSettingsRef = useRef(messSettings);
  const joiningDateRef = useRef(joiningDate);
  myRoleRef.current = myRole;
  messSettingsRef.current = messSettings;
  joiningDateRef.current = joiningDate;

  // Pure helper — reads only from refs/args, no closure over component variables.
  // Always checks with "member" role so admin bypass does NOT prevent the date
  // from shifting after the advance cutoff deadline passes.
  const computeMinDate = () => {
    const todayStr = getTodayString();
    const tomorrow = addDays(todayStr, 1);
    const settings = messSettingsRef.current;
    const joining = joiningDateRef.current;
    const tomorrowAllowed = (["breakfast", "lunch", "dinner"] as MealSlot[]).some(
      (slot) => checkMealToggleAllowed(slot, tomorrow, "member", settings, joining).allowed
    );
    const baseMin = tomorrowAllowed ? tomorrow : addDays(todayStr, 2);
    if (joining && joining > baseMin) return joining;
    return baseMin;
  };

  const [minSelectableDate, setMinSelectableDate] = useState(computeMinDate);

  // Interval fires every 10s — set up ONCE on mount, never reset.
  // Reads from refs so it always has fresh myRole / messSettings / joiningDate.
  useEffect(() => {
    const refresh = () => setMinSelectableDate(computeMinDate());
    refresh(); // immediate on mount
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: refs keep values fresh without re-mounting interval

  // Immediate recompute when cutoff rules change in settings (no need to wait for interval)
  const prevCutoffRef = useRef<string>("");
  const cutoffKey = `${messSettings.cutoff_days_before}|${messSettings.cutoff_single_time}|${messSettings.cutoff_time_mode}`;
  if (prevCutoffRef.current !== cutoffKey) {
    prevCutoffRef.current = cutoffKey;
    // Defer so refs are updated first
    setTimeout(() => setMinSelectableDate(computeMinDate()), 0);
  }

  const [fromDate, setFromDate] = useState(computeMinDate);
  const [toDate, setToDate] = useState(computeMinDate);

  // Push dates forward when minSelectableDate advances (cutoff just passed)
  useEffect(() => {
    setFromDate((prev) => (prev < minSelectableDate ? minSelectableDate : prev));
    setToDate((prev) => (prev < minSelectableDate ? minSelectableDate : prev));
  }, [minSelectableDate]);

  const [selectedMeals, setSelectedMeals] = useState<MealSlot[]>(["breakfast", "lunch", "dinner"]);
  const [applying, setApplying] = useState(false);
  const [activeAction, setActiveAction] = useState<"on" | "off" | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"on" | "off" | null>(null);
  const [activeOpenPreset, setActiveOpenPreset] = useState<OpenPreset>(null);

  const datesInRange = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];
    return getDatesInRange(fromDate, toDate);
  }, [fromDate, toDate]);

  const blockedDates = useMemo(() =>
    datesInRange.filter((date) => {
      const check = checkMealToggleAllowed("lunch", date, "member", messSettings, joiningDate);
      return !check.allowed;
    }), [datesInRange, messSettings, joiningDate]);

  const allowedDates = useMemo(() =>
    datesInRange.filter((date) =>
      selectedMeals.some(slot =>
        checkMealToggleAllowed(slot, date, "member", messSettings, joiningDate).allowed
      )
    ), [datesInRange, selectedMeals, messSettings, joiningDate]);

  const willChangeCount = useMemo(() => ({
    on: allowedDates.filter(date => {
      const m = getMealForDate(date);
      return selectedMeals.some(slot => !(m?.[slot] ?? true));
    }).length,
    off: allowedDates.filter(date => {
      const m = getMealForDate(date);
      return selectedMeals.some(slot => m?.[slot] ?? true);
    }).length,
  }), [allowedDates, selectedMeals, getMealForDate]);

  const toggleMeal = (slot: MealSlot) =>
    setSelectedMeals(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );

  const applyPreset = (days: number) => {
    setFromDate(minSelectableDate);
    setToDate(addDays(minSelectableDate, days - 1));
    setActiveOpenPreset(null);
  };

  const applyOpenPreset = (preset: "sick" | "off_until_on") => {
    if (isAccountBlocked) { toast.error(t.violations.leaveBlocked); return; }
    setFromDate(minSelectableDate);
    setToDate(addDays(minSelectableDate, maxLeaveDays - 1));
    setSelectedMeals(["breakfast", "lunch", "dinner"]);
    setActiveOpenPreset(preset);
    // Mark open leave start in DB (only fires once — service ignores if already set)
    if (memberId) markOpenLeave.mutate(memberId);
  };

  const handleManualDateChange = (field: "from" | "to", value: string) => {
    setActiveOpenPreset(null);
    if (field === "from") {
      const newFrom = value;
      setFromDate(newFrom);
      // If toDate goes out of range after from changes, clamp it
      const maxTo = addDays(newFrom, maxLeaveDays - 1);
      if (toDate > maxTo) {
        setToDate(maxTo);
        toast.warning(t.meals.rangeMaxDaysWarning.replace("{days}", String(maxLeaveDays)));
      } else if (newFrom > toDate) {
        setToDate(newFrom);
      }
    } else {
      const maxTo = addDays(fromDate, maxLeaveDays - 1);
      if (value > maxTo) {
        setToDate(maxTo);
        toast.warning(t.meals.rangeMaxDaysWarning.replace("{days}", String(maxLeaveDays)));
      } else {
        setToDate(value);
      }
    }
  };

  const handleActionRequest = (action: "on" | "off") => {
    if (isAccountBlocked) { toast.error(t.violations.mealBlocked); return; }
    if (datesInRange.length === 0) { toast.error(t.meals.rangeNoDates); return; }
    if (selectedMeals.length === 0) { toast.error(t.meals.rangeNoMeals); return; }
    if (activeOpenPreset || datesInRange.length > CONFIRM_THRESHOLD || action === "off") {
      setConfirmAction(action);
      return;
    }
    executeApply(action);
  };

  const executeApply = async (action: "on" | "off") => {
    setApplying(true);
    setActiveAction(action);
    const total = allowedDates.length;
    setProgress({ done: 0, total: total || 1 });
    let done = 0;
    const skippedCount = datesInRange.length - allowedDates.length;

    try {
      for (let i = 0; i < allowedDates.length; i += BATCH_SIZE) {
        const batch = allowedDates.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (date) => {
            const existing = getMealForDate(date);
            // Turn ON → restore the member's recurring default (not blindly true)
            // Turn OFF → set to false (going on leave)
            const resolveSlot = (slot: MealSlot) => {
              if (!selectedMeals.includes(slot)) return existing?.[slot] ?? true;
              return action === "on" ? mealDefaults[slot] : false;
            };
            await onUpdate({
              date,
              breakfast: resolveSlot("breakfast"),
              lunch:     resolveSlot("lunch"),
              dinner:    resolveSlot("dinner"),
            });
            done++;
            setProgress({ done, total });
          })
        );
      }
      toast.success(
        t.meals.rangeSuccess
          .replace("{done}", String(done))
          .replace("{skipped}", String(skippedCount))
      );
      if (action === "off") setActiveOpenPreset(null);
      // When turning meals ON → clear open leave tracking
      if (action === "on" && memberId) {
        clearOpenLeave.mutate({ memberId, currentStatus: accountStatus });
      }
    } finally {
      setApplying(false);
      setActiveAction(null);
      setTimeout(() => setProgress(null), 1500);
    }
  };

  const mealSlots: { key: MealSlot; label: string }[] = [
    { key: "breakfast", label: t.meals.breakfast },
    { key: "lunch",     label: t.meals.lunch     },
    { key: "dinner",    label: t.meals.dinner     },
  ];

  const busy = applying || isPending;
  const progressPct = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  const disabled = busy || !memberId || datesInRange.length === 0 || isAccountBlocked;

  const isOpenPresetConfirm = activeOpenPreset !== null && confirmAction === "off";
  const confirmTitle = isOpenPresetConfirm
    ? t.meals.rangeOpenLeaveConfirmTitle
    : confirmAction === "off"
      ? t.meals.rangeConfirmOffTitle
      : t.meals.rangeConfirmOnTitle;
  const confirmBody = isOpenPresetConfirm
    ? t.meals.rangeOpenLeaveConfirmBody
        .replace("{to}", toDate)
        .replace("{days}", String(maxLeaveDays))
    : (confirmAction === "off"
        ? t.meals.rangeConfirmOff
        : t.meals.rangeConfirmOn
      ).replace("{count}", String(datesInRange.length));

  return (
    <>
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50/60 to-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plane className="h-4 w-4 text-orange-500" />
            {t.meals.rangeTitle}
            {datesInRange.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {datesInRange.length} {t.meals.rangeDays}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t.meals.rangeNote}</p>

          {/* Quick preset buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t.meals.rangePresets}</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: t.meals.rangePreset3, days: 3 },
                { label: t.meals.rangePreset7, days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => applyPreset(days)}
                  disabled={busy}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 bg-white/70 text-orange-700 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {label}
                </button>
              ))}

              {allowOpenLeavePresets && (
                <>
                  <button
                    type="button"
                    onClick={() => applyOpenPreset("sick")}
                    disabled={busy}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 active:scale-95",
                      activeOpenPreset === "sick"
                        ? "border-amber-400 bg-amber-100 text-amber-800"
                        : "border-orange-200 bg-white/70 text-orange-700 hover:bg-orange-50"
                    )}
                  >
                    {t.meals.rangePresetSickLeave}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOpenPreset("off_until_on")}
                    disabled={busy}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 active:scale-95",
                      activeOpenPreset === "off_until_on"
                        ? "border-red-400 bg-red-100 text-red-800"
                        : "border-orange-200 bg-white/70 text-orange-700 hover:bg-orange-50"
                    )}
                  >
                    {t.meals.rangePresetOffUntilOn}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Open preset info banner */}
          {activeOpenPreset && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {t.meals.rangeSickLeaveInfo.replace(/{days}/g, String(maxLeaveDays))}
              </p>
            </div>
          )}

          {/* Date range inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t.meals.rangeFrom}</Label>
              <Input
                type="date"
                value={fromDate}
                min={minSelectableDate}
                onChange={(e) => handleManualDateChange("from", e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t.meals.rangeTo}</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate || minSelectableDate}
                max={addDays(fromDate || minSelectableDate, maxLeaveDays - 1)}
                onChange={(e) => handleManualDateChange("to", e.target.value)}
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Preview panel */}
          {datesInRange.length > 0 && (
            <div className="rounded-xl bg-white/70 border border-orange-200 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">
                {t.meals.rangePreviewDays.replace("{count}", String(datesInRange.length))}
              </p>

              {/* Will change summary */}
              {allowedDates.length > 0 && (
                <div className="flex gap-4">
                  <span className="text-[11px] font-medium text-green-700 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                    {t.meals.rangeWillChangeOn.replace("{count}", String(willChangeCount.on))}
                  </span>
                  <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                    {t.meals.rangeWillChangeOff.replace("{count}", String(willChangeCount.off))}
                  </span>
                </div>
              )}

            </div>
          )}

          {/* Meal type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t.meals.rangeMealTypes}</Label>
            <div className="grid grid-cols-3 gap-2">
              {mealSlots.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMeal(key)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border-2 transition-all",
                    selectedMeals.includes(key)
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background text-muted-foreground border-border/50 hover:border-border"
                  )}
                >
                  <span className="text-base">{MEAL_EMOJIS[key]}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {progress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t.meals.rangeApplying}</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleActionRequest("on")}
              disabled={disabled}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {busy && activeAction === "on" ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{progressPct}%</>
              ) : (
                <><Check className="h-4 w-4 mr-1.5" />{t.meals.rangeTurnOn}</>
              )}
            </Button>
            <Button
              onClick={() => handleActionRequest("off")}
              disabled={disabled}
              variant="destructive"
              className="w-full"
            >
              {busy && activeAction === "off" ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{progressPct}%</>
              ) : (
                <><X className="h-4 w-4 mr-1.5" />{t.meals.rangeTurnOff}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmAction!;
                setConfirmAction(null);
                executeApply(action);
              }}
              className={
                confirmAction === "off"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {t.meals.rangeConfirmBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
