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
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          username: username ?? null,
          subscription: subscription.toJSON(),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`subscribe request failed: ${res.status} ${body}`);
      }
      setSubscribed(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [supported, address, username]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
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
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
