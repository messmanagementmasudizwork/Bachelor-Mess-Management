"use client";
import { useState, useId, useRef, useEffect } from "react";
import {
  Bell, Plus, Pin, PinOff, Trash2, Send, Calendar,
  MapPin, MessageSquare, Megaphone, PartyPopper, Mic, Volume2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import {
  useNotices, useCreateNotice, useTogglePin, useDeleteNotice,
} from "@/lib/hooks/use-notices";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";
import {
  useMessages, useRealtimeMessages, useSendMessage, useDeleteMessage,
  useEvents, useCreateEvent, useDeleteEvent,
} from "@/lib/hooks/use-messages";
import { storageService } from "@/lib/services/storage.service";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useAuthStore } from "@/lib/stores/auth.store";

type NoticeFormData = {
  title: string;
  content: string;
  is_pinned: boolean;
  has_expiry: boolean;
  expires_at?: string;
};

type EventFormData = {
  title: string;
  description?: string;
  event_date: string;
  location?: string;
};

function NoticeBoard({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: notices = [], isLoading } = useNotices();
  const togglePin = useTogglePin();
  const deleteNotice = useDeleteNotice();
  const createNotice = useCreateNotice();
  const uid = useId();

  const noticeSchema = z.object({
    title: z.string().min(3, t.notices.noticeTitle),
    content: z.string().min(5, t.notices.noticeContent),
    is_pinned: z.boolean(),
    has_expiry: z.boolean(),
    expires_at: z.string().optional(),
  });

  const activeNotices = notices.filter(
    (n) => n.expires_at == null || isFuture(new Date(n.expires_at))
  );

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NoticeFormData>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { title: "", content: "", is_pinned: false, has_expiry: false, expires_at: "" },
  });

  const hasExpiry = watch("has_expiry");
  const isPinned = watch("is_pinned");

  const onSubmit = (data: NoticeFormData) => {
    createNotice.mutate({
      title: data.title,
      content: data.content,
      is_pinned: data.is_pinned,
      expires_at: data.has_expiry && data.expires_at ? new Date(data.expires_at).toISOString() : null,
    }, { onSuccess: () => { reset(); setCreateOpen(false); } });
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> {t.notices.publishNotice}
        </Button>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : activeNotices.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title={t.notices.noNotices}
          description={isAdmin ? t.notices.noNoticesAdmin : t.notices.noNoticesMember}
          action={isAdmin ? { label: t.notices.publishNotice, onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        activeNotices.map((notice) => (
          <Card key={notice.id} className={cn("border", notice.is_pinned && "border-primary/50 bg-primary/5")}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {notice.is_pinned && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Pin className="h-3 w-3" /> {t.notices.pinned}
                      </Badge>
                    )}
                    {notice.expires_at && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {formatDistanceToNow(new Date(notice.expires_at), { addSuffix: true })} {t.notices.expired}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">{notice.title}</h3>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => togglePin.mutate({ id: notice.id, isPinned: !notice.is_pinned })}
                      title={notice.is_pinned ? t.notices.unpin : t.notices.pin}
                    >
                      {notice.is_pinned
                        ? <PinOff className="h-4 w-4 text-muted-foreground" />
                        : <Pin className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteNotice.mutate(notice.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notice.content}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                {notice.creator_name && <span>{notice.creator_name}</span>}
                <span>•</span>
                <span>{formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.notices.publishTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-title`}>{t.notices.noticeTitle}</Label>
              <Input id={`${uid}-title`} placeholder={t.notices.noticeTitle} {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-content`}>{t.notices.noticeContent}</Label>
              <Textarea id={`${uid}-content`} placeholder={t.notices.noticeContent} rows={4} {...register("content")} />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t.notices.pinLabel}</p>
                <p className="text-xs text-muted-foreground">{t.notices.pinDesc}</p>
              </div>
              <Switch checked={isPinned} onCheckedChange={(v) => setValue("is_pinned", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t.notices.setExpiry}</p>
                <p className="text-xs text-muted-foreground">{t.notices.expirySetDesc}</p>
              </div>
              <Switch checked={hasExpiry} onCheckedChange={(v) => setValue("has_expiry", v)} />
            </div>
            {hasExpiry && (
              <div className="space-y-1.5">
                <Label>{t.notices.expiryDate}</Label>
                <Input
                  type="datetime-local"
                  {...register("expires_at")}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t.cancel}</Button>
              <Button type="submit" disabled={createNotice.isPending}>
                {createNotice.isPending ? t.notices.publishing : t.notices.publish}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupChat() {
  const { t } = useLanguage();
  const { formatTimePref } = usePreferences();
  const { data: messages = [], isLoading } = useMessages();
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useRealtimeMessages();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate({ content: trimmed, message_type: "text" });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const result = await storageService.uploadMedia(user.id, file);
      sendMessage.mutate({
        content: t.notices.voiceMsg,
        message_type: "voice",
        audio_url: result.url,
      });
    } catch {
      // silent fail — storage not configured
    } finally {
      setUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-2/3 rounded-xl" />)}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title={t.notices.noMessages}
            description={t.notices.firstMsg}
          />
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.sender_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[75%] group relative")}>
                  {!isMe && (
                    <p className="text-xs text-muted-foreground mb-1 ml-1">{msg.sender_name}</p>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}>
                    {msg.message_type === "announcement" && (
                      <span className="text-xs font-semibold block mb-1 opacity-75">
                        {t.notices.announcement}
                      </span>
                    )}
                    {msg.message_type === "voice" && msg.audio_url ? (
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <Volume2 className="h-4 w-4 flex-shrink-0 opacity-75" />
                        <audio controls src={msg.audio_url} className="h-7 w-full" style={{ minWidth: 140 }} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <p className={cn(
                    "text-[10px] text-muted-foreground mt-1",
                    isMe ? "text-right mr-1" : "ml-1"
                  )}>
                    {formatTimePref(new Date(msg.created_at))}
                  </p>
                  {isMe && (
                    <button
                      onClick={() => deleteMessage.mutate(msg.id)}
                      className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-full p-0.5"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleVoiceUpload}
        />
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0 self-end"
          disabled={uploading}
          title={t.notices.sendVoice}
          onClick={() => audioInputRef.current?.click()}
        >
          <Mic className={cn("h-4 w-4", uploading && "animate-pulse text-primary")} />
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.notices.messagePlaceholder}
          rows={1}
          className="resize-none min-h-[40px]"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          className="flex-shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EventPlanning({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const { formatTimePref, formatDatePref } = usePreferences();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: events = [], isLoading } = useEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const uid = useId();

  const eventSchema = z.object({
    title: z.string().min(3, t.notices.eventTitle),
    description: z.string().optional(),
    event_date: z.string().min(1, t.notices.eventDateTime),
    location: z.string().optional(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", description: "", event_date: "", location: "" },
  });

  const onSubmit = (data: EventFormData) => {
    createEvent.mutate({
      title: data.title,
      description: data.description || undefined,
      event_date: new Date(data.event_date).toISOString(),
      location: data.location || undefined,
    }, { onSuccess: () => { reset(); setCreateOpen(false); } });
  };

  const upcoming = events.filter((e) => isFuture(new Date(e.event_date)));
  const past = events.filter((e) => !isFuture(new Date(e.event_date)));

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> {t.notices.addEvent}
        </Button>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-8 w-8" />}
          title={t.notices.noEvents}
          description={isAdmin ? t.notices.noEventsAdmin : t.notices.noEventsMember}
          action={isAdmin ? { label: t.notices.addEvent, onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{t.notices.upcomingEvents}</h3>
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <Card key={event.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {`${formatDatePref(event.event_date)}, ${formatTimePref(new Date(event.event_date))}`}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteEvent.mutate(event.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t.notices.pastEvents}</h3>
              <div className="space-y-3">
                {past.map((event) => (
                  <Card key={event.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-medium text-foreground">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDatePref(event.event_date)}
                            {event.location && ` • ${event.location}`}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteEvent.mutate(event.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.notices.addEventTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-etitle`}>{t.notices.eventTitle}</Label>
              <Input id={`${uid}-etitle`} placeholder={t.notices.eventNamePlaceholder} {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-edesc`}>{t.notices.eventDescription}</Label>
              <Textarea id={`${uid}-edesc`} placeholder={t.notices.eventDetailPlaceholder} rows={2} {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-edate`}>{t.notices.eventDateTime}</Label>
                <Input
                  id={`${uid}-edate`}
                  type="datetime-local"
                  {...register("event_date")}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-eloc`}>{t.notices.eventLocation}</Label>
                <Input id={`${uid}-eloc`} placeholder={t.notices.eventLocationPlaceholder} {...register("location")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t.cancel}</Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? t.notices.eventAdding : t.notices.addEvent}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NoticesPage() {
  const { t } = useLanguage();
  const isAdmin = useHasPermission("notifications.send");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="notices">
        <p className="text-sm text-muted-foreground mb-3">{t.notices.pageSubtitle}</p>
        <TabsList className="w-full">
          <TabsTrigger value="notices" className="flex-1 gap-1.5">
            <Megaphone className="h-4 w-4" /> {t.notices.tabNotice}
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 gap-1.5">
            <MessageSquare className="h-4 w-4" /> {t.notices.tabChat}
          </TabsTrigger>
          <TabsTrigger value="events" className="flex-1 gap-1.5">
            <PartyPopper className="h-4 w-4" /> {t.notices.tabEvents}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notices" className="mt-4">
          <NoticeBoard isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <GroupChat />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <EventPlanning isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
