"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertCircle, UtensilsCrossed, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notification.types";
import { useAdminNoticeById } from "@/lib/hooks/use-admin-notices";
import { useVacationById } from "@/lib/hooks/use-vacation";
import type { AdminNotice } from "@/lib/services/admin-notice.service";
import type { MessVacation } from "@/lib/services/vacation.service";

/* ── date helpers ──────────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtFull(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
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
function NoticeContent({ notification, notice, isLoading }: {
  notification: Notification; notice: AdminNotice | null; isLoading: boolean;
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
                  label="Posted by"
                  value={notice.creator_name}
                />
              )}
              <Row
                icon={<Calendar className="h-4 w-4" />}
                label="Published"
                value={notice?.publish_at ? fmtDateShort(notice.publish_at) : fmtDateShort(notification.created_at)}
              />
              {notice?.expires_at && (
                <Row
                  icon={<Clock className="h-4 w-4" />}
                  label="Expires"
                  value={fmtDateShort(notice.expires_at)}
                  valueClass={isPast(notice.expires_at) ? "text-destructive" : "text-orange-600"}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label="Received"
                value={fmtFull(notification.created_at)}
              />
            </div>
          )}
        </div>
      </DialogDescription>
    </>
  );
}

/* ── MEETING content ───────────────────────────────────────────────────── */
function MeetingContent({ notification, notice, isLoading }: {
  notification: Notification; notice: AdminNotice | null; isLoading: boolean;
}) {
  const title    = notice?.title ?? notification.title.replace(/^📅 Meeting:\s*/i, "").replace(/^📅 সভা:\s*/i, "");
  const body     = notice?.body  ?? notification.body;
  const meetingAt = (notice?.meeting_at ?? notification.metadata?.meeting_at) as string | null | undefined;

  let statusBadge: React.ReactNode = null;
  if (meetingAt) {
    if (isPast(meetingAt)) {
      statusBadge = <Badge variant="secondary">সম্পন্ন</Badge>;
    } else if (isToday(meetingAt)) {
      statusBadge = <Badge className="bg-green-100 text-green-700 border-green-200">আজ</Badge>;
    } else {
      statusBadge = <Badge className="bg-blue-100 text-blue-700 border-blue-200">আসন্ন</Badge>;
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
                    label="Meeting Date"
                    value={fmtDate(meetingAt)}
                  />
                  <Row
                    icon={<Clock className="h-4 w-4" />}
                    label="Meeting Time"
                    value={fmtTime(meetingAt)}
                    valueClass="text-primary font-semibold"
                  />
                </>
              )}
              {notice?.creator_name && (
                <Row
                  icon={<User className="h-4 w-4" />}
                  label="Organized by"
                  value={notice.creator_name}
                />
              )}
              {notice?.expires_at && (
                <Row
                  icon={<AlertCircle className="h-4 w-4" />}
                  label="Notice Expires"
                  value={fmtDateShort(notice.expires_at)}
                  valueClass={isPast(notice.expires_at) ? "text-destructive" : "text-orange-600"}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label="Notified"
                value={fmtFull(notification.created_at)}
              />
            </div>
          )}
        </div>
      </DialogDescription>
    </>
  );
}

/* ── VACATION content ──────────────────────────────────────────────────── */
function VacationContent({ notification, vacation, isLoading }: {
  notification: Notification; vacation: MessVacation | null; isLoading: boolean;
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
      statusBadge = <Badge className="bg-blue-100 text-blue-700 border-blue-200">আসন্ন</Badge>;
    } else if (today > endDate) {
      statusBadge = <Badge variant="secondary">শেষ হয়েছে</Badge>;
    } else {
      statusBadge = <Badge className="bg-amber-100 text-amber-700 border-amber-200">চলমান</Badge>;
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
                  label="শুরু"
                  value={fmtDateShort(startDate)}
                />
              )}
              {endDate && (
                <Row
                  icon={<Calendar className="h-4 w-4" />}
                  label="শেষ"
                  value={fmtDateShort(endDate)}
                />
              )}
              {days !== null && (
                <Row
                  icon={<Clock className="h-4 w-4" />}
                  label="মোট ছুটি"
                  value={`${days} দিন`}
                  valueClass="text-amber-700 font-semibold"
                />
              )}
              <Row
                icon={<UtensilsCrossed className="h-4 w-4" />}
                label="মিল স্ট্যাটাস"
                value="ছুটির সময় সব মিল বন্ধ"
                valueClass="text-destructive"
              />
              {reopens && (
                <Row
                  icon={<RotateCcw className="h-4 w-4" />}
                  label="মেস চালু"
                  value={fmtDateShort(reopens)}
                  valueClass="text-green-600 font-semibold"
                />
              )}
              {reason && (
                <Row
                  icon={<AlertCircle className="h-4 w-4" />}
                  label="কারণ"
                  value={reason}
                />
              )}
              <Row
                icon={<Clock className="h-4 w-4" />}
                label="ঘোষণা"
                value={fmtFull(notification.created_at)}
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

function GenericContent({ notification }: { notification: Notification }) {
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
            🕐 {fmtFull(notification.created_at)}
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
        return <MeetingContent notification={notification!} notice={notice ?? null} isLoading={noticeLoading} />;
      }
      return <NoticeContent notification={notification!} notice={notice ?? null} isLoading={noticeLoading} />;
    }
    if (notification!.type === "vacation_announced") {
      return <VacationContent notification={notification!} vacation={vacation ?? null} isLoading={vacationLoading} />;
    }
    return <GenericContent notification={notification!} />;
  }

  return (
    <Dialog open={!!notification} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
