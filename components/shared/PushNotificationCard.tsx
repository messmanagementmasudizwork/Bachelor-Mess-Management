"use client";
import { BellRing, BellOff, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePushNotification, type PushMode } from "@/lib/hooks/use-push-notification";
import { useLanguage } from "@/lib/hooks/use-language";

export function PushNotificationCard() {
  const { t } = useLanguage();
  const { permission, isSubscribed, isLoading, mode, enablePush, disablePush } = usePushNotification();

  const modeLabels: Record<PushMode, { title: string; icon: React.ReactNode; badge: string; badgeClass: string }> = {
    full: {
      title: "Background Push Notification",
      icon: <BellRing className="h-4 w-4" />,
      badge: t.notifications.fullSupport,
      badgeClass: "bg-blue-600 text-white",
    },
    tab_only: {
      title: t.notifications.browserNotification,
      icon: <Smartphone className="h-4 w-4" />,
      badge: t.notifications.tabMode,
      badgeClass: "bg-amber-500 text-white",
    },
    unsupported: {
      title: t.notifications.noApiSupport,
      icon: <BellOff className="h-4 w-4" />,
      badge: t.notifications.unsupported,
      badgeClass: "bg-gray-400 text-white",
    },
  };

  const cfg = modeLabels[mode];

  if (mode === "unsupported") {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <BellOff className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{t.notifications.noApiSupport}</p>
            <p className="text-xs text-muted-foreground">{t.notifications.noApiSupportDesc}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const descriptionText = () => {
    if (isSubscribed && mode === "full") return t.notifications.pushEnabled;
    if (isSubscribed && mode === "tab_only") return t.notifications.tabEnabled;
    if (permission === "denied") return t.notifications.permissionBlocked;
    if (mode === "tab_only") return t.notifications.enableDesc;
    return t.notifications.pushDesc;
  };

  return (
    <Card className={cn(
      "transition-all",
      isSubscribed
        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
        : permission === "denied"
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        : "border-primary/20 bg-primary/5"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {cfg.icon}
          {cfg.title}
          <span className={cn("text-xs px-2 py-0.5 rounded-full ml-auto font-normal", cfg.badgeClass)}>
            {cfg.badge}
          </span>
          {isSubscribed && (
            <Badge variant="default" className="bg-green-600 text-white text-xs">
              {t.notifications.statusActive}
            </Badge>
          )}
          {!isSubscribed && permission === "denied" && (
            <Badge variant="destructive" className="text-xs">{t.notifications.statusBlocked}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">{descriptionText()}</p>
        {mode === "tab_only" && !isSubscribed && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              💡 <strong>Replit Preview:</strong> {t.notifications.iframeNote}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button
              size="sm"
              onClick={enablePush}
              disabled={isLoading || permission === "denied"}
              className="gap-1.5"
            >
              <BellRing className="h-4 w-4" />
              {isLoading ? t.notifications.enabling : t.notifications.enableBtn}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={disablePush}
              disabled={isLoading}
              className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <BellOff className="h-4 w-4" />
              {isLoading ? t.notifications.disabling : t.notifications.disableBtn}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
