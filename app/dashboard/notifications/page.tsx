"use client";
import { useState } from "react";
import { Bell, CheckCheck, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils/date";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/lib/hooks/use-notifications";
import { NotificationDetailDialog } from "@/components/shared/NotificationDetailDialog";
import type { NotificationType } from "@/lib/types";
import type { Notification } from "@/lib/types/notification.types";
import { useLanguage } from "@/lib/hooks/use-language";

const notificationTypeConfig: Record<NotificationType | "default", { icon: string; color: string }> = {
  expense_added:        { icon: "🛒", color: "bg-orange-100 text-orange-700" },
  expense_approved:     { icon: "✅", color: "bg-green-100 text-green-700" },
  deposit_confirmed:    { icon: "💰", color: "bg-emerald-100 text-emerald-700" },
  meal_reminder:        { icon: "🍽️", color: "bg-blue-100 text-blue-700" },
  due_reminder:         { icon: "⚠️", color: "bg-red-100 text-red-700" },
  manager_changed:      { icon: "👑", color: "bg-purple-100 text-purple-700" },
  member_joined:        { icon: "🙋", color: "bg-sky-100 text-sky-700" },
  member_removed:       { icon: "🚪", color: "bg-gray-100 text-gray-700" },
  month_closed:         { icon: "📅", color: "bg-violet-100 text-violet-700" },
  low_balance:          { icon: "📉", color: "bg-rose-100 text-rose-700" },
  rule_violation:       { icon: "🚫", color: "bg-amber-100 text-amber-700" },
  vacation_announced:   { icon: "🏖️", color: "bg-amber-100 text-amber-700" },
  admin_notice:         { icon: "📢", color: "bg-purple-100 text-purple-700" },
  system:               { icon: "🔔", color: "bg-gray-100 text-gray-700" },
  default:              { icon: "🔔", color: "bg-gray-100 text-gray-700" },
};

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead    = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const openDetail = (notif: Notification) => {
    if (!notif.is_read) markAsRead.mutate(notif.id);
    setSelectedNotif(notif);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            {t.notifications.markAllRead}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border">
              <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications?.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={t.notifications.empty}
          description={t.notifications.emptyDesc}
        />
      ) : (
        <div className="space-y-2">
          {notifications?.map((notification) => {
            const config =
              notificationTypeConfig[notification.type as NotificationType] ??
              notificationTypeConfig.default;
            return (
              <Card
                key={notification.id}
                onClick={() => openDetail(notification)}
                className={cn(
                  "transition-all cursor-pointer hover:shadow-md active:scale-[0.99]",
                  !notification.is_read && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-xl flex-shrink-0",
                      config.color
                    )}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-semibold", !notification.is_read && "text-primary")}>
                        {notification.title}
                      </p>
                      {!notification.is_read ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatTimestamp(notification.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NotificationDetailDialog
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </div>
  );
}
