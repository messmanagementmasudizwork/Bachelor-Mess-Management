"use client";
import { useState } from "react";
import {
  Bell, Menu, LogOut, Settings, CheckCheck,
  UtensilsCrossed, Receipt, Wallet, Users, AlertTriangle,
  Plane, Megaphone, UserCog, Calendar, Shield, ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui.store";
import { useMessStore } from "@/lib/stores/mess.store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDetailDialog } from "@/components/shared/NotificationDetailDialog";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead,
} from "@/lib/hooks/use-notifications";
import { useActiveVacation } from "@/lib/hooks/use-vacation";
import { useAllActiveAdminNotices } from "@/lib/hooks/use-admin-notices";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/hooks/use-language";
import { getPageTitleKeys } from "./nav.config";
import type { Notification, NotificationType } from "@/lib/types/notification.types";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function formatDateShort(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getDaysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isVacationActive(startDate: string, endDate: string) {
  const today = new Date().toISOString().split("T")[0]!;
  return startDate <= today && today <= endDate;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function notifIcon(type: NotificationType, size: "sm" | "lg" = "sm") {
  const cls = size === "lg" ? "h-6 w-6" : "h-3.5 w-3.5";
  switch (type) {
    case "meal_reminder":      return <UtensilsCrossed className={cls} />;
    case "expense_added":
    case "expense_approved":   return <Receipt className={cls} />;
    case "deposit_confirmed":  return <Wallet className={cls} />;
    case "member_joined":
    case "member_removed":     return <Users className={cls} />;
    case "due_reminder":
    case "low_balance":        return <AlertTriangle className={cls} />;
    case "vacation_announced": return <Plane className={cls} />;
    case "admin_notice":       return <Megaphone className={cls} />;
    case "manager_changed":    return <UserCog className={cls} />;
    case "month_closed":       return <Calendar className={cls} />;
    case "rule_violation":     return <Shield className={cls} />;
    default:                   return <Bell className={cls} />;
  }
}

function notifIconBg(type: NotificationType): string {
  switch (type) {
    case "meal_reminder":      return "bg-orange-100 text-orange-600";
    case "expense_added":
    case "expense_approved":   return "bg-blue-100 text-blue-600";
    case "deposit_confirmed":  return "bg-green-100 text-green-600";
    case "member_joined":      return "bg-violet-100 text-violet-600";
    case "member_removed":     return "bg-red-100 text-red-600";
    case "due_reminder":
    case "low_balance":        return "bg-yellow-100 text-yellow-600";
    case "vacation_announced": return "bg-cyan-100 text-cyan-600";
    case "admin_notice":       return "bg-purple-100 text-purple-600";
    case "manager_changed":    return "bg-indigo-100 text-indigo-600";
    case "month_closed":       return "bg-slate-100 text-slate-600";
    default:                   return "bg-muted text-muted-foreground";
  }
}

/* ─── main component ───────────────────────────────────────────────────── */

export function Header() {
  const { toggleMobileMenu } = useUIStore();
  const { activeMess } = useMessStore();
  const { user, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAsRead    = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const { data: vacation } = useActiveVacation();
  const { data: notices = [] } = useAllActiveAdminNotices();
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "bn" ? "bn-BD" : "en-GB";

  const [bellOpen, setBellOpen]           = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const vacationActive   = vacation ? isVacationActive(vacation.start_date, vacation.end_date) : false;
  const vacationDaysLeft = vacation && !vacationActive ? getDaysUntil(vacation.start_date) : 0;

  const { itemLabelKey, description: pageDescription } = getPageTitleKeys(pathname);
  const pageTitle = itemLabelKey
    ? (t.nav as Record<string, string>)[itemLabelKey] ?? "MessPilot"
    : "MessPilot";

  const recentNotifs = notifications.slice(0, 6);

  function openDetail(notif: Notification) {
    setBellOpen(false);
    if (!notif.is_read) markAsRead.mutate(notif.id);
    setSelectedNotif(notif);
  }

  return (
    <>
      <header className="fixed top-0 left-0 lg:left-16 right-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:px-6">

        {/* Mobile: hamburger */}
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={toggleMobileMenu}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile: mess name */}
        <div className="flex-1 lg:hidden min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {activeMess?.name ?? "MessPilot"}
          </p>
        </div>

        {/* Desktop left: mess name + page title */}
        <div className="hidden lg:flex flex-col justify-center min-w-0 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none truncate">
            {activeMess?.name ?? "MessPilot"}
          </p>
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5 truncate">{pageTitle}</p>
          {pageDescription && (
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">{pageDescription}</p>
          )}
        </div>

        {/* Desktop center: scrolling notice ticker */}
        {(() => {
          const tv = t.vacation;
          const items: string[] = [];

          if (vacation) {
            const totalDays = Math.round(
              (new Date(vacation.end_date).getTime() - new Date(vacation.start_date).getTime()) / 86400000
            ) + 1;
            const reopenDate = new Date(vacation.end_date);
            reopenDate.setDate(reopenDate.getDate() + 1);
            const segments = [
              `🗓️ ${tv.tickerLabel}`, vacation.title,
              `${formatDateShort(vacation.start_date, dateLocale)} — ${formatDateShort(vacation.end_date, dateLocale)}`,
              `${totalDays} ${tv.days}`,
              vacation.reason ? `${tv.tickerReason}: ${vacation.reason}` : null,
              `${tv.tickerMessReopens}: ${formatDateShort(reopenDate.toISOString().split("T")[0]!, dateLocale)}`,
              vacationActive ? tv.tickerOngoing : `${vacationDaysLeft} ${tv.tickerDaysLeft}`,
            ].filter(Boolean) as string[];
            items.push(segments.join("  |  "));
          }

          for (const n of notices) {
            const typeLabel = n.notice_type === "meeting" ? "📅 Meeting" : "📢 Notice";
            const body = n.body.length > 100 ? n.body.slice(0, 100) + "…" : n.body;
            items.push(`${typeLabel}  |  ${n.title}  |  ${body}`);
          }

          if (items.length === 0) return <div className="hidden lg:block flex-1" />;

          const sep      = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0·\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
          const text     = items.join(sep) + sep;
          const colorCls = vacation
            ? vacationActive
              ? "text-amber-700 border-amber-200 bg-amber-50/60"
              : "text-blue-700 border-blue-200 bg-blue-50/60"
            : "text-purple-700 border-purple-200 bg-purple-50/60";

          return (
            <div className={cn("hidden lg:flex flex-1 mx-6 overflow-hidden rounded-full border h-7 items-center", colorCls)}>
              <div className="ticker-track text-xs font-medium">
                <span>{text}</span><span>{text}</span><span>{text}</span><span>{text}</span>
              </div>
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex items-center gap-2">

          {/* Bell dropdown */}
          <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
            <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60 hover:bg-muted hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus-visible:outline-none data-[state=open]:bg-muted">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive border-2 border-background",
                  "text-[9px] font-bold text-white flex items-center justify-center"
                )}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-80 p-0">

              {/* Dropdown header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-destructive text-white rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead.mutate()}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              {recentNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No notifications yet.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72">
                  <div className="py-1">
                    {recentNotifs.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => openDetail(notif)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                          !notif.is_read && "bg-primary/5"
                        )}
                      >
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5", notifIconBg(notif.type))}>
                          {notifIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs leading-snug truncate", !notif.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {notif.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {relativeTime(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dropdown footer */}
              <div className="border-t">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setBellOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View all notifications
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User pill dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-muted/60 hover:bg-muted hover:shadow-sm transition-all duration-200 pl-3 pr-1 py-1 cursor-pointer focus:outline-none focus-visible:outline-none data-[state=open]:bg-muted">
              <span className="hidden lg:block text-xs font-medium text-foreground max-w-[96px] truncate leading-none">
                {(() => {
                  const parts = user?.user_metadata?.full_name?.trim().split(/\s+/) ?? [];
                  if (parts.length >= 2) return parts[1];
                  if (parts.length === 1) return parts[0];
                  return user?.email?.split("@")[0] ?? "User";
                })()}
              </span>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-[10px] font-semibold">
                  {getInitials(user?.user_metadata?.full_name ?? user?.email ?? "U")}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold truncate">{user?.user_metadata?.full_name ?? "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <NotificationDetailDialog
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
      />
    </>
  );
}
