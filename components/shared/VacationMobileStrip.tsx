"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useActiveVacation } from "@/lib/hooks/use-vacation";
import { useAllActiveAdminNotices } from "@/lib/hooks/use-admin-notices";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";

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

function formatDateShort(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function VacationMobileStrip() {
  const { data: vacation, isLoading: vacLoading } = useActiveVacation();
  const { data: notices = [], isLoading: noticeLoading } = useAllActiveAdminNotices();
  const { t, lang } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (vacLoading || noticeLoading) return null;
  if (!vacation && notices.length === 0) return null;
  if (dismissed)                         return null;

  const tv         = t.vacation;
  const dateLocale = lang === "bn" ? "bn-BD" : "en-GB";
  const active     = vacation ? isVacationActive(vacation.start_date, vacation.end_date) : false;
  const daysUntil  = vacation && !active ? getDaysUntil(vacation.start_date) : 0;

  // ── Build ticker items ────────────────────────────────────
  const items: string[] = [];

  if (vacation) {
    const totalDays = Math.round(
      (new Date(vacation.end_date).getTime() - new Date(vacation.start_date).getTime()) / 86400000
    ) + 1;
    const reopenDate = new Date(vacation.end_date);
    reopenDate.setDate(reopenDate.getDate() + 1);

    const segments = [
      `🗓️ ${tv.tickerLabel}`,
      vacation.title,
      `${formatDateShort(vacation.start_date, dateLocale)} — ${formatDateShort(vacation.end_date, dateLocale)}`,
      `${totalDays} ${tv.days}`,
      vacation.reason ? `${tv.tickerReason}: ${vacation.reason}` : null,
      `${tv.tickerMessReopens}: ${formatDateShort(reopenDate.toISOString().split("T")[0]!, dateLocale)}`,
      active ? tv.tickerOngoing : `${daysUntil} ${tv.tickerDaysLeft}`,
    ].filter(Boolean) as string[];

    items.push(segments.join("  |  "));
  }

  for (const n of notices) {
    const typeLabel = n.notice_type === "meeting" ? "📅 Meeting" : "📢 Notice";
    const body = n.body.length > 80 ? n.body.slice(0, 80) + "…" : n.body;
    items.push(`${typeLabel}  |  ${n.title}  |  ${body}`);
  }

  if (items.length === 0) return null;

  const sep       = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0·\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
  const text      = items.join(sep) + sep;
  const colorCls  = vacation
    ? active
      ? "bg-amber-50 border-b border-amber-200 text-amber-800"
      : "bg-blue-50 border-b border-blue-200 text-blue-800"
    : "bg-purple-50 border-b border-purple-200 text-purple-800";

  return (
    <div className={cn("lg:hidden flex items-center gap-2 h-7", colorCls)}>
      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-track text-xs font-medium">
          <span>{text}</span>
          <span>{text}</span>
          <span>{text}</span>
          <span>{text}</span>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 mr-2 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
