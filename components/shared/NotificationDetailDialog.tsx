"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertCircle, UtensilsCrossed, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notification.types";
import { useAdminNoticeById } from "@/lib/hooks/use-admin-notices";
import { useVacationById } from "@/lib/hooks/use-vacation";
import { useLanguage } from "@/lib/hooks/use-language";
import type { AdminNotice } from "@/lib/services/admin-notice.service";
import type { MessVacation } from "@/lib/services/vacation.service";

/* ── date helpers ──────────────────────────────────────────────────────── */

function fmtDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtDateShort(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(d: string, locale: string) {
  return new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
function fmtFull(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function totalDays(start: string, end: string) {
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end);   e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}
function addDay(d: string) {
  const dt = new Date(d); dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split("T")[0]!;
}
function isPast(d: string) { return new Date(d) < new Date(); }
function isToday(d: string) {
  const t = new Date().toISOString().split("T")[0]!;
  return d.startsWith(t);
}

/* ── translation dict type ─────────────────────────────────────────────── */
type DetailT = {
  postedBy: string; published: string; expires: string; received: string;
  meetingDate: string; meetingTime: string; organizedBy: string;
  noticeExpires: string; notified: string; announced: string;
  startDate: string; endDate: string; totalDays: string;
  mealStatus: string; mealsStopped: string; messReopens: string;
  reason: string; days: string;
  statusDone: string; statusToday: string; statusUpcoming: string;
  statusOngoing: string; statusEnded: string;
};

/* ── shared detail row ─────────────────────────────────────────────────── */
function Row({ icon, label, value, valueClass }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={cn("text-sm font-medium flex-1 text-right", valueClass)}>{value}</span>
    </div>
  );
}

/* ── loading skeleton ──────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[80, 64, 56, 72].map((w, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className={`h-4 w-${w === 80 ? "32" : w === 64 ? "24" : w === 56 ? "20" : "28"} ml-auto`} />
        </div>
      ))}
    </div>
  );
}

/* ── NOTICE content ────────────────────────────────────────────────────── */
function NoticeContent({ notification, notice, isLoading, d, locale }: {
  notification: Notification; notice: AdminNotice | null; isLoading: boolean;
  d: DetailT; locale: string;
}) {
  const title = notice?.title ?? notification.title.replace(/^📢 Notice:\s*/i, "").replace(/^📢 বিজ্ঞপ্তি:\s*/i, "");
  const body  = notice?.body  ?? notification.body;

  return (
    <>
      <DialogHeader>
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
            📢
          </div>
        </div>
        <DialogTitle className="text-center text-base font-semibold leading-snug">
          {title}
        </DialogTitle>
      </DialogHeader>

      <DialogDescription asChild>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-3">
            {body}
          </p>

          {isLoading ? <LoadingSkeleton /> : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {notice?.creator_name && (
                <Row
                  icon={<User className="h-4 w-4" />}
                  label={d.postedBy}
                  value={notice.creator_name}
                />
              )}
              <Row
                icon={<Calendar className="h-4 w-4" />}
                label={d.published}
                value={notice?.publish_at ? fmtDateShort(notice.publish_at, locale) : fmtDateShort(notification.created_at, locale)}
              />
              {notice?.expires_at && (
                <Row
                  icon={<Clock className="h-4 w-4" />}
                  label={d.expires}
                  value={fmtDateShort(notice.expires_at, locale)}
                  valueClass={isPast(notice.expires_at) ? "text-destructive" : "text-orange-600"}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label={d.received}
                value={fmtFull(notification.created_at, locale)}
              />
            </div>
          )}
        </div>
      </DialogDescription>
    </>
  );
}

/* ── MEETING content ───────────────────────────────────────────────────── */
function MeetingContent({ notification, notice, isLoading, d, locale }: {
  notification: Notification; notice: AdminNotice | null; isLoading: boolean;
  d: DetailT; locale: string;
}) {
  const title     = notice?.title ?? notification.title.replace(/^📅 Meeting:\s*/i, "").replace(/^📅 সভা:\s*/i, "");
  const body      = notice?.body  ?? notification.body;
  const meetingAt = (notice?.meeting_at ?? notification.metadata?.meeting_at) as string | null | undefined;

  let statusBadge: React.ReactNode = null;
  if (meetingAt) {
    if (isPast(meetingAt)) {
      statusBadge = <Badge variant="secondary">{d.statusDone}</Badge>;
    } else if (isToday(meetingAt)) {
      statusBadge = <Badge className="bg-green-100 text-green-700 border-green-200">{d.statusToday}</Badge>;
    } else {
      statusBadge = <Badge className="bg-blue-100 text-blue-700 border-blue-200">{d.statusUpcoming}</Badge>;
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex justify-center mb-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            📅
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          {statusBadge}
        </div>
        <DialogTitle className="text-center text-base font-semibold leading-snug">
          {title}
        </DialogTitle>
      </DialogHeader>

      <DialogDescription asChild>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-3">
            {body}
          </p>

          {isLoading ? <LoadingSkeleton /> : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {meetingAt && (
                <>
                  <Row
                    icon={<Calendar className="h-4 w-4" />}
                    label={d.meetingDate}
                    value={fmtDate(meetingAt, locale)}
                  />
                  <Row
                    icon={<Clock className="h-4 w-4" />}
                    label={d.meetingTime}
                    value={fmtTime(meetingAt, locale)}
                    valueClass="text-primary font-semibold"
                  />
                </>
              )}
              {notice?.creator_name && (
                <Row
                  icon={<User className="h-4 w-4" />}
                  label={d.organizedBy}
                  value={notice.creator_name}
                />
              )}
              {notice?.expires_at && (
                <Row
                  icon={<AlertCircle className="h-4 w-4" />}
                  label={d.noticeExpires}
                  value={fmtDateShort(notice.expires_at, locale)}
                  valueClass={isPast(notice.expires_at) ? "text-destructive" : "text-orange-600"}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label={d.notified}
                value={fmtFull(notification.created_at, locale)}
              />
            </div>
          )}
        </div>
      </DialogDescription>
    </>
  );
}

/* ── VACATION content ──────────────────────────────────────────────────── */
function VacationContent({ notification, vacation, isLoading, d, locale }: {
  notification: Notification; vacation: MessVacation | null; isLoading: boolean;
  d: DetailT; locale: string;
}) {
  const meta      = notification.metadata as Record<string, string> | null;
  const startDate = vacation?.start_date ?? meta?.start_date;
  const endDate   = vacation?.end_date   ?? meta?.end_date;
  const title     = vacation?.title ?? notification.title.replace(/^🏖️.*?—\s*/u, "");
  const reason    = vacation?.reason;

  let statusBadge: React.ReactNode = null;
  if (startDate && endDate) {
    const today = new Date().toISOString().split("T")[0]!;
    if (today < startDate) {
      statusBadge = <Badge className="bg-blue-100 text-blue-700 border-blue-200">{d.statusUpcoming}</Badge>;
    } else if (today > endDate) {
      statusBadge = <Badge variant="secondary">{d.statusEnded}</Badge>;
    } else {
      statusBadge = <Badge className="bg-amber-100 text-amber-700 border-amber-200">{d.statusOngoing}</Badge>;
    }
  }

  const days    = startDate && endDate ? totalDays(startDate, endDate) : null;
  const reopens = endDate ? addDay(endDate) : null;

  return (
    <>
      <DialogHeader>
        <div className="flex justify-center mb-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
            🏖️
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          {statusBadge}
        </div>
        <DialogTitle className="text-center text-base font-semibold leading-snug">
          {title}
        </DialogTitle>
      </DialogHeader>

      <DialogDescription asChild>
        <div className="space-y-4 mt-2">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {startDate && (
                <Row
                  icon={<Calendar className="h-4 w-4" />}
                  label={d.startDate}
                  value={fmtDateShort(startDate, locale)}
                />
              )}
              {endDate && (
                <Row
                  icon={<Calendar className="h-4 w-4" />}
                  label={d.endDate}
                  value={fmtDateShort(endDate, locale)}
                />
              )}
              {days !== null && (
                <Row
                  icon={<Clock className="h-4 w-4" />}
                  label={d.totalDays}
                  value={`${days} ${d.days}`}
                  valueClass="text-amber-700 font-semibold"
                />
              )}
              <Row
                icon={<UtensilsCrossed className="h-4 w-4" />}
                label={d.mealStatus}
                value={d.mealsStopped}
                valueClass="text-destructive"
              />
              {reopens && (
                <Row
                  icon={<RotateCcw className="h-4 w-4" />}
                  label={d.messReopens}
                  value={fmtDateShort(reopens, locale)}
                  valueClass="text-green-600 font-semibold"
                />
              )}
              {reason && (
                <Row
                  icon={<AlertCircle className="h-4 w-4" />}
                  label={d.reason}
                  value={reason}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label={d.announced}
                value={fmtFull(notification.created_at, locale)}
              />
            </div>
          )}
        </div>
      </DialogDescription>
    </>
  );
}

/* ── GENERIC content ───────────────────────────────────────────────────── */
const NOTIF_ICON: Record<string, string> = {
  expense_added:     "🛒", expense_approved: "✅", deposit_confirmed: "💰",
  meal_reminder:     "🍽️", due_reminder:     "⚠️", manager_changed:  "👑",
  member_joined:     "🙋", member_removed:   "🚪", month_closed:      "📅",
  low_balance:       "📉", rule_violation:   "🚫", system:            "🔔",
};
const NOTIF_COLOR: Record<string, string> = {
  expense_added:     "bg-orange-100",  expense_approved:  "bg-green-100",
  deposit_confirmed: "bg-emerald-100", meal_reminder:     "bg-blue-100",
  due_reminder:      "bg-red-100",     manager_changed:   "bg-purple-100",
  member_joined:     "bg-sky-100",     member_removed:    "bg-gray-100",
  month_closed:      "bg-violet-100",  low_balance:       "bg-rose-100",
  rule_violation:    "bg-amber-100",   system:            "bg-gray-100",
};

function GenericContent({ notification, locale }: { notification: Notification; locale: string }) {
  const icon  = NOTIF_ICON[notification.type]  ?? "🔔";
  const color = NOTIF_COLOR[notification.type] ?? "bg-gray-100";
  return (
    <>
      <DialogHeader>
        <div className="flex justify-center mb-4">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-3xl", color)}>
            {icon}
          </div>
        </div>
        <DialogTitle className="text-center text-base font-semibold leading-snug">
          {notification.title}
        </DialogTitle>
      </DialogHeader>
      <DialogDescription asChild>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-3 text-center">
            {notification.body}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            🕐 {fmtFull(notification.created_at, locale)}
          </p>
        </div>
      </DialogDescription>
    </>
  );
}

/* ── main export ───────────────────────────────────────────────────────── */
interface Props {
  notification: Notification | null;
  onClose: () => void;
}

export function NotificationDetailDialog({ notification, onClose }: Props) {
  const { t, lang } = useLanguage();
  const locale      = lang === "bn" ? "bn-BD" : "en-GB";
  const d           = t.notifications.detail as DetailT;

  const noticeId   = notification?.type === "admin_notice"
    ? (notification.metadata?.notice_id as string | undefined)
    : undefined;
  const vacationId = notification?.type === "vacation_announced"
    ? (notification.metadata?.vacation_id as string | undefined)
    : undefined;

  const { data: notice,   isLoading: noticeLoading   } = useAdminNoticeById(noticeId);
  const { data: vacation, isLoading: vacationLoading } = useVacationById(vacationId);

  if (!notification) return null;

  const noticeSubType: string =
    (notification.metadata?.notice_type as string) ??
    (notification.title.startsWith("📅") ? "meeting" : "notice");

  function renderContent() {
    if (notification!.type === "admin_notice") {
      if (noticeSubType === "meeting") {
        return <MeetingContent notification={notification!} notice={notice ?? null} isLoading={noticeLoading} d={d} locale={locale} />;
      }
      return <NoticeContent notification={notification!} notice={notice ?? null} isLoading={noticeLoading} d={d} locale={locale} />;
    }
    if (notification!.type === "vacation_announced") {
      return <VacationContent notification={notification!} vacation={vacation ?? null} isLoading={vacationLoading} d={d} locale={locale} />;
    }
    return <GenericContent notification={notification!} locale={locale} />;
  }

  return (
    <Dialog open={!!notification} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
