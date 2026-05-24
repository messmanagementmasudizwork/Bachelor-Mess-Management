"use client";
import { Plane, CalendarRange, X, Clock } from "lucide-react";
import { useState } from "react";
import { useActiveVacation } from "@/lib/hooks/use-vacation";
import { useLanguage } from "@/lib/hooks/use-language";

function formatDateBn(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("bn-BD", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getDayCount(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

function getDaysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isVacationActive(startDate: string, endDate: string) {
  const today = new Date().toISOString().split("T")[0]!;
  return startDate <= today && today <= endDate;
}

export function VacationBanner() {
  const { t } = useLanguage();
  const { data: vacation, isLoading } = useActiveVacation();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !vacation || dismissed) return null;

  const days = getDayCount(vacation.start_date, vacation.end_date);
  const active = isVacationActive(vacation.start_date, vacation.end_date);
  const daysUntil = active ? 0 : getDaysUntil(vacation.start_date);

  if (active) {
    return (
      <div className="relative flex items-start gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5 shadow-sm dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900">
          🏖️
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Plane className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {t.vacation.bannerTitle}
            </span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-100">
              {days} {t.vacation.days}
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900 dark:text-red-200 animate-pulse">
              ● চলছে
            </span>
          </div>

          <p className="mt-0.5 text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
            {vacation.title}
          </p>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <CalendarRange className="h-3 w-3 shrink-0" />
            <span>
              {formatDateBn(vacation.start_date)} — {formatDateBn(vacation.end_date)}
            </span>
          </div>

          {vacation.reason && (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400 truncate">
              {vacation.reason}
            </p>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900 transition-colors"
          aria-label="dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-start gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3.5 shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl dark:bg-blue-900">
        🗓️
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            আসন্ন মেস ছুটি
          </span>
          <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100">
            {days} {t.vacation.days}
          </span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-200">
            {daysUntil} দিন বাকি
          </span>
        </div>

        <p className="mt-0.5 text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
          {vacation.title}
        </p>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
          <CalendarRange className="h-3 w-3 shrink-0" />
          <span>
            {formatDateBn(vacation.start_date)} — {formatDateBn(vacation.end_date)}
          </span>
        </div>

        {vacation.reason && (
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400 truncate">
            {vacation.reason}
          </p>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-lg p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 transition-colors"
        aria-label="dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
