export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Detect if running inside an iframe (e.g. Replit preview pane) */
export function isInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error("[Push] SW registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error("[Push] VAPID public key missing");
    return null;
  }
  const registration = await registerServiceWorker();
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
    return subscription;
  } catch (err) {
    const error = err as Error;
    if (
      error?.name === "AbortError" ||
      error?.message?.includes("push service error") ||
      error?.message?.includes("Registration failed")
    ) {
      console.warn("[Push] Push service unreachable (likely iframe/sandbox). Falling back to tab-only notifications.");
    } else {
      console.error("[Push] Subscription failed:", err);
    }
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return true;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    return subscription.unsubscribe();
  } catch {
    return false;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return null;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function showBrowserNotification(title: string, body: string, actionUrl?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: "messpilot-inapp-" + Date.now(),
    });
    if (actionUrl) {
      notification.onclick = () => {
        window.focus();
        window.location.href = actionUrl;
        notification.close();
      };
    }
  } catch (err) {
    console.warn("[Push] showBrowserNotification failed:", err);
  }
}
