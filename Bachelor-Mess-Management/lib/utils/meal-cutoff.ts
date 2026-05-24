// ============================================================
// Meal Cutoff & Notice Period Enforcement Utilities
// ============================================================

import type { MessSettings } from "@/lib/types";
import type { MemberRole } from "@/lib/types";
import { getT } from "@/lib/i18n/get-t";

export type MealSlot = "breakfast" | "lunch" | "dinner";

/**
 * Parse "HH:mm" string into { hours, minutes }
 */
function parseCutoff(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

/**
 * Get current time as minutes since midnight (local timezone)
 */
function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Convert HH:mm to minutes since midnight
 */
function cutoffToMinutes(time: string): number {
  const { hours, minutes } = parseCutoff(time);
  return hours * 60 + minutes;
}

/**
 * Subtract N days from a YYYY-MM-DD string, return YYYY-MM-DD.
 * Uses local date methods (not toISOString) to avoid UTC timezone shift
 * for users in UTC+ timezones (e.g. Bangladesh UTC+6).
 */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Today as YYYY-MM-DD (local timezone)
 */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolve the effective cutoff time for a slot, respecting time mode.
 * single → cutoff_single_time for every slot
 * per_meal → slot-specific meal cutoff time
 */
function resolveSlotTime(slot: MealSlot, settings: Partial<MessSettings>): string {
  const mode = settings.cutoff_time_mode ?? "per_meal";
  if (mode === "single") {
    return settings.cutoff_single_time ?? "22:00";
  }
  const perMealMap: Record<MealSlot, string> = {
    breakfast: settings.meal_cutoff_breakfast ?? "08:00",
    lunch:     settings.meal_cutoff_lunch     ?? "10:00",
    dinner:    settings.meal_cutoff_dinner    ?? "16:00",
  };
  return perMealMap[slot];
}

/**
 * Check if current time is past the same-day cutoff for a given meal slot.
 * Used for TODAY's quick-toggle section display.
 * When cutoff_days_before > 0 — today's meal deadline was already N days ago,
 * so it is always locked for regular members.
 */
export function isPastCutoff(slot: MealSlot, settings: Partial<MessSettings>): boolean {
  const daysBeforeCutoff = settings.cutoff_days_before ?? 0;

  if (daysBeforeCutoff > 0) {
    return true;
  }

  return nowMinutes() >= cutoffToMinutes(resolveSlotTime(slot, settings));
}

/**
 * Check if ALL meal slots are past cutoff for today
 */
export function isAllPastCutoff(settings: Partial<MessSettings>): boolean {
  return (
    isPastCutoff("breakfast", settings) &&
    isPastCutoff("lunch", settings) &&
    isPastCutoff("dinner", settings)
  );
}

/**
 * Get the cutoff time display string for a slot.
 * Respects cutoff_time_mode — single returns one time, per_meal returns slot-specific.
 */
export function getCutoffDisplay(slot: MealSlot, settings: Partial<MessSettings>): string {
  return resolveSlotTime(slot, settings);
}

/**
 * Human-readable deadline text for a target meal date.
 * Only meaningful in advance mode (cutoff_days_before > 0) + single time mode.
 * Returns "" otherwise (per_meal advance shows per-slot context instead).
 */
export function getCutoffDeadlineText(targetDate: string, settings: Partial<MessSettings>): string {
  const daysBeforeCutoff = settings.cutoff_days_before ?? 0;
  if (daysBeforeCutoff === 0) return "";

  const mode = settings.cutoff_time_mode ?? "per_meal";
  if (mode !== "single") return "";

  const cutoffDate = subtractDays(targetDate, daysBeforeCutoff);
  const singleTime = settings.cutoff_single_time ?? "22:00";

  const dayNames = getT().mealCutoffExt.dayNames;
  const d = new Date(cutoffDate + "T00:00:00");
  const dayName = dayNames[d.getDay()];

  return getT().mealCutoffExt.confirmBefore
    .replace("{dayName}", dayName ?? "")
    .replace("{time}", singleTime);
}

/**
 * Roles that can bypass cutoff time restrictions
 */
const CUTOFF_BYPASS_ROLES: MemberRole[] = ["owner", "admin", "manager"];

/**
 * Check if a role can bypass meal cutoff rules
 */
export function canBypassCutoff(role?: MemberRole): boolean {
  if (!role) return false;
  return CUTOFF_BYPASS_ROLES.includes(role);
}

/**
 * Core function — check if toggling a meal is allowed for a given role and date.
 *
 * Supports two orthogonal axes:
 *  1. Days before (cutoff_days_before): 0 = same day, 1/2 = advance
 *  2. Time mode   (cutoff_time_mode):   single = one time for all, per_meal = per slot
 *
 * Optional joiningDate: blocks any date before the member's joining date.
 */
export function checkMealToggleAllowed(
  slot: MealSlot,
  date: string,
  role: MemberRole | undefined,
  settings: Partial<MessSettings>,
  joiningDate?: string
): { allowed: boolean; reason?: string; isLate: boolean } {
  // ── Block dates before member's joining date ──────────────────────────────
  if (joiningDate && date < joiningDate) {
    return { allowed: false, reason: getT().mealCutoffExt.beforeJoiningDate, isLate: false };
  }

  const today = todayStr();
  const daysBeforeCutoff = settings.cutoff_days_before ?? 0;

  // ── Advance cutoff mode (1 or 2 days before) ─────────────────────────────
  if (daysBeforeCutoff > 0) {
    const cutoffDate = subtractDays(date, daysBeforeCutoff);
    // In single mode: one deadline for all slots.
    // In per_meal mode: each slot has its own deadline on the cutoff day.
    const slotCutoffTime = resolveSlotTime(slot, settings);

    if (today > cutoffDate) {
      if (canBypassCutoff(role)) {
        return { allowed: true, isLate: true, reason: getT().mealCutoffExt.adminOverride };
      }
      const passedKey = daysBeforeCutoff === 1
        ? getT().mealCutoffExt.advanceCutoffPassed1Day
        : getT().mealCutoffExt.advanceCutoffPassed2Days;
      return { allowed: false, isLate: false, reason: passedKey };
    }

    if (today === cutoffDate) {
      const currentMins = nowMinutes();
      const cutoffMins  = cutoffToMinutes(slotCutoffTime);
      if (currentMins >= cutoffMins) {
        if (canBypassCutoff(role)) {
          return { allowed: true, isLate: true, reason: getT().mealCutoffExt.cutoffTimeAdminOverride };
        }
        const mode = settings.cutoff_time_mode ?? "per_meal";
        const reason = mode === "single"
          ? `${getCutoffDeadlineText(date, settings)} ${getT().mealCutoffExt.timePassed}`
          : (() => {
              const mc = getT().mealCutoffExt;
              const slotLabel = slot === "breakfast" ? mc.slotBreakfast : slot === "lunch" ? mc.slotLunch : mc.slotDinner;
              return mc.slotCutoffPassed.replace("{slot}", slotLabel).replace("{cutoff}", slotCutoffTime);
            })();
        return { allowed: false, isLate: false, reason };
      }
      return { allowed: true, isLate: false };
    }

    // today < cutoffDate → always allowed
    return { allowed: true, isLate: false };
  }

  // ── Same-day cutoff mode ──────────────────────────────────────────────────
  const isPastDate = date < today;

  if (isPastDate) {
    if (canBypassCutoff(role)) {
      return { allowed: true, isLate: true };
    }
    return { allowed: false, reason: getT().mealCutoffExt.pastDateNotAllowed, isLate: false };
  }

  if (date !== today) {
    return { allowed: true, isLate: false };
  }

  const past = isPastCutoff(slot, settings);
  if (!past) {
    return { allowed: true, isLate: false };
  }

  if (canBypassCutoff(role)) {
    return { allowed: true, isLate: true, reason: getT().mealCutoffExt.cutoffTimeAdminOverride };
  }

  const cutoff = getCutoffDisplay(slot, settings);
  const mc = getT().mealCutoffExt;
  const slotLabel = slot === "breakfast" ? mc.slotBreakfast : slot === "lunch" ? mc.slotLunch : mc.slotDinner;
  return {
    allowed: false,
    isLate: false,
    reason: mc.slotCutoffPassed.replace("{slot}", slotLabel).replace("{cutoff}", cutoff),
  };
}

/**
 * Returns the cutoff deadline as a Unix timestamp (ms) for a given target date.
 * Only meaningful for advance + single mode — returns null otherwise.
 * (per_meal advance: each slot has its own deadline; handled per-slot in UI)
 */
export function getCutoffDeadlineMs(targetDate: string, settings: Partial<MessSettings>): number | null {
  const daysBeforeCutoff = settings.cutoff_days_before ?? 0;
  if (daysBeforeCutoff === 0) return null;

  const mode = settings.cutoff_time_mode ?? "per_meal";
  if (mode !== "single") return null;

  const cutoffDate = subtractDays(targetDate, daysBeforeCutoff);
  const singleTime = settings.cutoff_single_time ?? "22:00";
  return new Date(`${cutoffDate}T${singleTime}:00`).getTime();
}

/**
 * Returns the cutoff deadline as a Unix timestamp (ms) for a specific meal slot.
 * Works for both single and per_meal modes when cutoff_days_before > 0.
 * Returns null when cutoff_days_before === 0 (same-day mode, no advance deadline).
 */
export function getCutoffDeadlineMsForSlot(
  slot: MealSlot,
  targetDate: string,
  settings: Partial<MessSettings>
): number | null {
  const daysBeforeCutoff = settings.cutoff_days_before ?? 0;
  if (daysBeforeCutoff === 0) return null;
  const cutoffDate = subtractDays(targetDate, daysBeforeCutoff);
  const slotTime = resolveSlotTime(slot, settings);
  return new Date(`${cutoffDate}T${slotTime}:00`).getTime();
}

/**
 * Calculate late meal penalty for a member
 */
export function calculateLatePenalty(
  lateToggleCount: number,
  penaltyPerLate: number
): number {
  return lateToggleCount * penaltyPerLate;
}

/**
 * Calculate guest meal charge
 */
export function calculateGuestMealCharge(
  guestBreakfast: number,
  guestLunch: number,
  guestDinner: number,
  guestMealCharge: number
): number {
  const totalGuestMeals = guestBreakfast + guestLunch + guestDinner;
  return Math.round(totalGuestMeals * guestMealCharge * 100) / 100;
}
