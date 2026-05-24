import {
  format,
  parseISO,
  isToday,
  isYesterday,
  isTomorrow,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
  differenceInDays,
  addMonths,
  subMonths,
} from "date-fns";
import { getT } from "@/lib/i18n/get-t";

export const DATE_FORMAT = "yyyy-MM-dd";
export const MONTH_FORMAT = "yyyy-MM";
export const DISPLAY_DATE_FORMAT = "d MMMM, yyyy";
export const DISPLAY_MONTH_FORMAT = "MMMM yyyy";

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return format(new Date(), DATE_FORMAT);
}

/**
 * Get current month as YYYY-MM string
 */
export function getCurrentMonthString(): string {
  return format(new Date(), MONTH_FORMAT);
}

/**
 * Format date string for display
 */
export function formatDate(dateStr: string, fmt = DISPLAY_DATE_FORMAT): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

/**
 * Format month string for display
 */
export function formatMonth(monthStr: string): string {
  try {
    return format(parseISO(`${monthStr}-01`), DISPLAY_MONTH_FORMAT);
  } catch {
    return monthStr;
  }
}

/**
 * Get relative date label (today, yesterday, tomorrow) in current language
 */
export function getRelativeDateBn(dateStr: string): string {
  const date = parseISO(dateStr);
  const d = getT().dates;
  if (isToday(date)) return d.today;
  if (isYesterday(date)) return d.yesterday;
  if (isTomorrow(date)) return d.tomorrow;
  return formatDate(dateStr);
}

/**
 * Get all days in a month
 */
export function getDaysInMonth(monthStr: string): string[] {
  const date = parseISO(`${monthStr}-01`);
  const days = eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
  return days.map((d) => format(d, DATE_FORMAT));
}

/**
 * Get month range for queries
 */
export function getMonthRange(monthStr: string): {
  start: string;
  end: string;
} {
  const date = parseISO(`${monthStr}-01`);
  return {
    start: format(startOfMonth(date), DATE_FORMAT),
    end: format(endOfMonth(date), DATE_FORMAT),
  };
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateStr: string): boolean {
  return isBefore(parseISO(dateStr), new Date());
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(dateStr: string): boolean {
  return isAfter(parseISO(dateStr), new Date());
}

/**
 * Navigate months
 */
export function nextMonth(monthStr: string): string {
  return format(addMonths(parseISO(`${monthStr}-01`), 1), MONTH_FORMAT);
}

export function prevMonth(monthStr: string): string {
  return format(subMonths(parseISO(`${monthStr}-01`), 1), MONTH_FORMAT);
}

/**
 * Get days ago text in current language
 */
export function getTimeAgo(dateStr: string): string {
  const days = differenceInDays(new Date(), parseISO(dateStr));
  const d = getT().dates;
  if (days === 0) return d.today;
  if (days === 1) return d.yesterday;
  if (days < 30) return d.daysAgo.replace("{n}", String(days));
  return formatDate(dateStr);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = parseISO(timestamp);
    return format(date, "d MMM, h:mm a");
  } catch {
    return timestamp;
  }
}

/**
 * Check if meal cutoff time has passed
 */
export function isMealCutoffPassed(
  cutoffTime: string,
  date = new Date()
): boolean {
  const [hours, minutes] = cutoffTime.split(":").map(Number);
  const cutoff = new Date(date);
  cutoff.setHours(hours, minutes, 0, 0);
  return date > cutoff;
}
