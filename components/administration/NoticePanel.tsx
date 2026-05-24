"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Megaphone, Plus, Trash2, Clock, Send,
  CalendarClock, Users, Calendar, CalendarX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAdminNotices, useCreateAdminNotice, useDeleteAdminNotice } from "@/lib/hooks/use-admin-notices";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import type { AdminNotice, NoticeType } from "@/lib/services/admin-notice.service";

const schema = z.object({
  title:         z.string().min(2, "Title required"),
  body:          z.string().min(4, "Message required"),
  notice_type:   z.enum(["notice", "meeting"] as const),
  publish_mode:  z.enum(["now", "schedule"] as const),
  schedule_date: z.string().optional(),
  schedule_time: z.string().optional(),
  meeting_date:  z.string().optional(),
  meeting_time:  z.string().optional(),
  expiry_date:   z.string().optional(),
  expiry_time:   z.string().optional(),
}).refine((d) => {
  if (d.notice_type === "meeting") {
    return !!d.meeting_date && !!d.meeting_time;
  }
  return true;
}, { message: "Meeting date and time are required", path: ["meeting_date"] });

type FormData = z.infer<typeof schema>;

function formatPublishAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function isActive(publishAt: string | null): boolean {
  if (!publishAt) return true;
  return new Date(publishAt) <= new Date();
}

export function NoticePanel() {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: notices = [], isLoading } = useAdminNotices();
  const createNotice = useCreateAdminNotice();
  const deleteNotice = useDeleteAdminNotice();
  const canManage = useHasPermission("settings.manage");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", body: "", notice_type: "notice", publish_mode: "now",
      schedule_date: "", schedule_time: "08:00",
      meeting_date: "", meeting_time: "18:00",
      expiry_date: "", expiry_time: "23:59",
    },
  });

  const publishMode   = form.watch("publish_mode");
  const noticeType    = form.watch("notice_type");
  const expiryDate    = form.watch("expiry_date");
  const isMeetingForm = noticeType === "meeting";

  const onSubmit = async (data: FormData) => {
    let publish_at: string | null = null;
    if (data.publish_mode === "schedule" && data.schedule_date && data.schedule_time) {
      publish_at = formatPublishAt(data.schedule_date, data.schedule_time);
    }

    let meeting_at: string | null = null;
    if (data.notice_type === "meeting" && data.meeting_date && data.meeting_time) {
      meeting_at = formatPublishAt(data.meeting_date, data.meeting_time);
    }

    let expires_at: string | null = null;
    if (data.notice_type === "notice" && data.expiry_date && data.expiry_time) {
      expires_at = formatPublishAt(data.expiry_date, data.expiry_time);
    }

    await createNotice.mutateAsync({
      title:       data.title,
      body:        data.body,
      notice_type: data.notice_type as NoticeType,
      publish_at,
      meeting_at,
      expires_at,
    });
    form.reset();
    setOpen(false);
  };

  const activeNotices   = notices.filter(n => isActive(n.publish_at));
  const upcomingNotices = notices.filter(n => !isActive(n.publish_at));

  const todayStr = new Date().toISOString().split("T")[0]!;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Notice Panel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish notices and meeting announcements for all members
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                Add Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Add Notice / Meeting
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

                {/* Type selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["notice", "meeting"] as const).map((type) => {
                      const active = noticeType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => form.setValue("notice_type", type, { shouldValidate: false })}
                          className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-colors ${
                            active
                              ? type === "meeting"
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                              : "border-input bg-background hover:bg-muted"
                          }`}
                        >
                          {type === "meeting" ? <Users className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                          {type === "meeting" ? "Meeting" : "Notice"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Input
                    {...form.register("title")}
                    placeholder={
                      isMeetingForm
                        ? "e.g. Monthly Meeting — June 2026"
                        : "e.g. Mess Rent Due Reminder"
                    }
                  />
                  {form.formState.errors.title && (
                    <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Message *</Label>
                  <Textarea
                    {...form.register("body")}
                    rows={3}
                    placeholder={
                      isMeetingForm
                        ? "Meeting agenda, venue, or any details..."
                        : "Write the notice content..."
                    }
                    className="resize-none"
                  />
                  {form.formState.errors.body && (
                    <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
                  )}
                </div>

                {/* Meeting date & time (only for meeting type) */}
                {isMeetingForm && (
                  <div className="space-y-1.5 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                      <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        Meeting Date & Time *
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input
                          type="date"
                          {...form.register("meeting_date")}
                          min={todayStr}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input
                          type="time"
                          {...form.register("meeting_time")}
                        />
                      </div>
                    </div>
                    {form.formState.errors.meeting_date && (
                      <p className="text-xs text-destructive">{form.formState.errors.meeting_date.message}</p>
                    )}
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                      ⏰ Auto-reminders: 1 day before & 30 min before meeting
                    </p>
                  </div>
                )}

                {/* Expiry date (only for notice type — meetings auto-expire) */}
                {!isMeetingForm && (
                  <div className="space-y-1.5 rounded-xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-800 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CalendarX className="h-3.5 w-3.5 text-orange-600" />
                      <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                        Expiry Date <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input
                          type="date"
                          {...form.register("expiry_date")}
                          min={todayStr}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input
                          type="time"
                          {...form.register("expiry_time")}
                          disabled={!expiryDate}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">
                      ⏳ Notice will auto-hide from ticker after this date/time
                    </p>
                  </div>
                )}

                {/* Publish mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Publish</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["now", "schedule"] as const).map((mode) => {
                      const active = publishMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => form.setValue("publish_mode", mode)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input bg-background hover:bg-muted"
                          }`}
                        >
                          {mode === "now"
                            ? <><Send className="h-3.5 w-3.5" /> Publish Now</>
                            : <><Clock className="h-3.5 w-3.5" /> Schedule</>
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule picker */}
                {publishMode === "schedule" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        {...form.register("schedule_date")}
                        min={todayStr}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Time</Label>
                      <Input type="time" {...form.register("schedule_time")} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 h-9" disabled={createNotice.isPending}>
                    {createNotice.isPending
                      ? "Publishing..."
                      : publishMode === "schedule" ? "Schedule" : "Publish Now"
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Notices list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : activeNotices.length === 0 && upcomingNotices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">
              📢
            </div>
            <p className="text-sm font-medium text-muted-foreground">No notices published yet</p>
            {canManage && (
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Notice" to publish the first one
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeNotices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Active ({activeNotices.length})
              </p>
              {activeNotices.map(notice => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  canManage={canManage}
                  onDelete={() => setDeleteTarget(notice.id)}
                />
              ))}
            </div>
          )}
          {upcomingNotices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Scheduled ({upcomingNotices.length})
              </p>
              {upcomingNotices.map(notice => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  canManage={canManage}
                  onDelete={() => setDeleteTarget(notice.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Notice?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This notice will be removed and will no longer appear for members.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteNotice.isPending}
              onClick={async () => {
                if (deleteTarget) {
                  await deleteNotice.mutateAsync(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              {deleteNotice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoticeCard({
  notice,
  canManage,
  onDelete,
}: {
  notice: AdminNotice;
  canManage: boolean;
  onDelete: () => void;
}) {
  const isMeeting = notice.notice_type === "meeting";
  const scheduled = notice.publish_at && new Date(notice.publish_at) > new Date();

  const meetingDateStr = notice.meeting_at
    ? new Date(notice.meeting_at).toLocaleString("en-GB", {
        weekday: "short", day: "numeric", month: "short",
        year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const isMeetingPast = notice.meeting_at
    ? new Date(notice.meeting_at) < new Date()
    : false;

  return (
    <div className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 ${
      isMeeting
        ? "border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:border-blue-800"
        : "border-violet-200 bg-gradient-to-r from-violet-50/60 to-purple-50/40 dark:from-violet-950/20 dark:border-violet-800"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${
          isMeeting ? "bg-blue-100 dark:bg-blue-900" : "bg-violet-100 dark:bg-violet-900"
        }`}>
          {isMeeting ? "📅" : "📢"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{notice.title}</p>
            <Badge
              variant="secondary"
              className={`text-[10px] py-0 px-1.5 h-4 ${
                isMeeting ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
              }`}
            >
              {isMeeting ? "Meeting" : "Notice"}
            </Badge>
            {scheduled && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 gap-1">
                <Clock className="h-2.5 w-2.5" />
                Scheduled
              </Badge>
            )}
            {isMeeting && isMeetingPast && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-muted text-muted-foreground">
                Completed
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notice.body}</p>

          {/* Meeting date/time */}
          {isMeeting && meetingDateStr && (
            <div className={`flex items-center gap-1 mt-1.5 ${isMeetingPast ? "opacity-50" : ""}`}>
              <CalendarClock className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                {isMeetingPast ? "Was: " : "Meeting: "}{meetingDateStr}
              </span>
            </div>
          )}

          {/* Publish time */}
          {notice.publish_at && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                {scheduled ? "Publishes:" : "Published:"}{" "}
                {new Date(notice.publish_at).toLocaleString("en-GB", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          )}

          {/* Expiry time (notices only) */}
          {notice.notice_type === "notice" && notice.expires_at && (
            <div className="flex items-center gap-1 mt-1">
              <CalendarX className="h-3 w-3 text-orange-500 shrink-0" />
              <span className={`text-[11px] font-medium ${
                new Date(notice.expires_at) <= new Date()
                  ? "text-red-500"
                  : "text-orange-600 dark:text-orange-400"
              }`}>
                {new Date(notice.expires_at) <= new Date() ? "Expired:" : "Expires:"}{" "}
                {new Date(notice.expires_at).toLocaleString("en-GB", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {canManage && (
          <button
            onClick={onDelete}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
