"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type Notification = {
  id: number;
  username: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export function useNotifications(username: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
        .limit(20);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => !n.read).length);
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

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
