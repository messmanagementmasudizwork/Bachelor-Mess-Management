"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  isPushSupported,
  isNotificationSupported,
  isInIframe,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
  getCurrentPushSubscription,
} from "@/lib/utils/push-notification";
import { getT } from "@/lib/i18n/get-t";

export type PushMode = "full" | "tab_only" | "unsupported";

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<PushMode>("unsupported");

  useEffect(() => {
    if (!isNotificationSupported()) {
      setMode("unsupported");
      return;
    }
    if (isInIframe() || !isPushSupported()) {
      setMode("tab_only");
    } else {
      setMode("full");
    }
    getNotificationPermission().then((p) => {
      setPermission(p);
      if (p === "granted") {
        setIsSubscribed(true);
        getCurrentPushSubscription().then((sub) => {
          if (!sub) setIsSubscribed(false);
        });
      }
    });
  }, []);

  const enablePush = useCallback(async () => {
    const t = getT();
    if (mode === "unsupported") {
      toast.error(t.toasts.pushNotSupported);
      return;
    }
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error(t.toasts.pushPermissionDenied);
        setIsLoading(false);
        return;
      }

      if (mode === "tab_only") {
        setIsSubscribed(true);
        toast.success("Browser Notification enabled! You will receive notifications while the tab is open.");
        setIsLoading(false);
        return;
      }

      const subscription = await subscribeToPush();
      if (!subscription) {
        setIsSubscribed(true);
        toast.success("Tab Notification enabled! You will receive notifications while the app is open.", {
          description: "For background push, open the app directly in the browser.",
          duration: 6000,
        });
        setIsLoading(false);
        return;
      }

      // Cookies are sent automatically with same-origin fetch — no Bearer token needed
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Subscription save failed");
      setIsSubscribed(true);
      toast.success("Push Notification enabled! You will receive notifications even when the app is closed.");
    } catch (err) {
      console.error("[Push] Enable failed:", err);
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const disablePush = useCallback(async () => {
    setIsLoading(true);
    try {
      await unsubscribeFromPush();
      // Cookies are sent automatically with same-origin fetch — no Bearer token needed
      await fetch("/api/push/subscribe", { method: "DELETE" }).catch(() => {});
      setIsSubscribed(false);
      toast.success("Notifications disabled");
    } catch (err) {
      console.error("[Push] Disable failed:", err);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isSubscribed, isLoading, mode, enablePush, disablePush };
}
