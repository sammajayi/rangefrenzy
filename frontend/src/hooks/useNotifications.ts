"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type Notification = {
  id: number;
  username: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

const HIDDEN_KEY = "notif-hidden-ids";

function getHiddenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function addHiddenId(id: number) {
  try {
    const ids = getHiddenIds();
    ids.add(id);
    // keep at most 200 to avoid unbounded growth
    const trimmed = [...ids].slice(-200);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function useNotifications(
  username: string | undefined,
  onNew?: (n: Notification) => void,
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const onNewRef = useRef(onNew);
  useEffect(() => { onNewRef.current = onNew; }, [onNew]);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const normalized = username.toLowerCase();

    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("username", normalized)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        const hidden = getHiddenIds();
        const visible = (data as Notification[]).filter((n) => !hidden.has(n.id));
        setNotifications(visible);
        setUnreadCount(visible.filter((n) => !n.read).length);
      }
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`notifications-${normalized}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `username=eq.${normalized}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((c) => c + 1);
          onNewRef.current?.(n);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [username]);

  const markAsRead = useCallback(
    async (id: number) => {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    if (!username) return;
    const normalized = username.toLowerCase();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("username", normalized)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [username]);

  const deleteNotification = useCallback(async (id: number) => {
    addHiddenId(id);
    await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === id);
      if (removed && !removed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification };
}
