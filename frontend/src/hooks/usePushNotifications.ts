"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function checkSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications(address: string | undefined, username: string | null | undefined) {
  const [supported] = useState(checkSupported);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    checkSupported() ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !address) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Push notifications are not configured on this deployment.");
      return;
    }
    setLoading(true);
    setError(null);

    const mkTimeout = (label: string) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out at: ${label}`)), 12_000)
      );

    try {
      const perm = await Promise.race([
        Notification.requestPermission(),
        mkTimeout("requestPermission"),
      ]);
      setPermission(perm);
      if (perm !== "granted") return;

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        mkTimeout("serviceWorker.ready"),
      ]);

      const subscription = await Promise.race([
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }),
        mkTimeout("pushManager.subscribe"),
      ]);

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          username: username ?? null,
          subscription: subscription.toJSON(),
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable notifications");
      console.error("Push subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [supported, address, username]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable notifications");
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
