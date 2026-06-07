"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GiftIcon,
  Award01Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
  Link03Icon,
} from "hugeicons-react";
import { supabase } from "@/lib/supabase";
import type { BonusEarning, BonusSource } from "@/lib/supabase";
import { BONUS_AMOUNTS } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { ClaimPage } from "@/components/gooddollar/ClaimPage";

interface Props {
  address: string;
}

interface TaskState {
  id: string;
  source: BonusSource;
  label: string;
  description: string;
  reward: number;
  status: "completed" | "pending" | "available";
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => Promise<void>;
  actionLoading?: boolean;
}

type Platform = "twitter" | "telegram";

export function EarnTab({ address }: Props) {
  const isVerified = useAppStore((s) => s.isVerified);
  const setVerified = useAppStore((s) => s.setVerified);
  const setHasSkippedVerification = useAppStore((s) => s.setHasSkippedVerification);

  const [bonuses, setBonuses] = useState<BonusEarning[]>([]);
  const [betCount, setBetCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakMsg, setStreakMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [bonusRes, betRes, profileRes] = await Promise.all([
      supabase.from("bonus_earnings").select("*").eq("wallet_address", address.toLowerCase()),
      supabase.from("stakes").select("id", { count: "exact", head: true }).eq("wallet_address", address.toLowerCase()),
      supabase.from("profiles").select("current_streak, referred_by").eq("wallet_address", address.toLowerCase()).maybeSingle(),
    ]);
    if (bonusRes.data) setBonuses(bonusRes.data as BonusEarning[]);
    setBetCount(betRes.count ?? 0);
    if (profileRes.data) {
      setStreak((profileRes.data as any).current_streak ?? 0);
      setReferredBy((profileRes.data as any).referred_by ?? null);
    }
    setLoading(false);
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasBonus = (source: BonusSource) => bonuses.some((b) => b.source === source);

  const doAction = async (source: BonusSource, apiPath: string, body: Record<string, string>) => {
    setActionLoading((prev) => ({ ...prev, [source]: true }));
    try {
      await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address.toLowerCase(), ...body }),
      });
      await fetchData();
    } catch (err) {
      console.error(`action ${source} error:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [source]: false }));
    }
  };

  const handleSocialConfirm = (platform: Platform) =>
    doAction("social_twitter", "/api/earn/social-follow", { platform });

  const handleDailyCheckIn = async () => {
    setStreakLoading(true);
    setStreakMsg(null);
    try {
      const res = await fetch("/api/earn/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address.toLowerCase() }),
      });
      const data = await res.json();
      setStreak(data.streak);
      if (data.bonuses_credited?.length) {
        setStreakMsg(`🎉 +${data.bonuses_credited.length} bonus${data.bonuses_credited.length > 1 ? "es" : ""} earned!`);
      } else {
        setStreakMsg(data.streak > 1 ? `🔥 ${data.streak}-day streak!` : "Day 1 — let's go!");
      }
      await fetchData();
    } catch {
      setStreakMsg("Something went wrong");
    } finally {
      setStreakLoading(false);
      setTimeout(() => setStreakMsg(null), 3000);
    }
  };

  const tasks: TaskState[] = [
    {
      id: "first-bet",
      source: "first_bet",
      label: "First Bet Bonus",
      description: hasBonus("first_bet")
        ? "Thanks for placing your first bet!"
        : betCount > 0
          ? "Your first bet is placed — bonus pending"
          : "Place your first bet to earn 10 G$ instantly",
      reward: BONUS_AMOUNTS.first_bet,
      status: hasBonus("first_bet") ? "completed" : betCount > 0 ? "pending" : "available",
    },
    {
      id: "streak",
      source: "streak_7",
      label: "Streak Rewards",
      description: streak === 0
        ? "Place a bet or claim G$ daily to build your streak"
        : `${streak} day${streak === 1 ? "" : "s"} — next milestone: ${streak < 7 ? "7 days" : "30 days"}`,
      reward: 0,
      status: "available",
    },
    {
      id: "referral",
      source: "referral_bonus",
      label: "Referral Mining",
      description: referredBy
        ? `You were referred by ${referredBy.slice(0, 6)}…`
        : "Share your link and earn when friends place their first bet",
      reward: BONUS_AMOUNTS.referral_bonus,
      status: hasBonus("referral_bonus") || hasBonus("referral_reward") ? "completed" : "available",
      actionLabel: referredBy ? undefined : "Copy Link",
      onAction: async () => {
        const link = `https://rangefrenzy.xyz/ref/${address}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      actionLoading: false,
    },
    {
      id: "social-twitter",
      source: "social_twitter",
      label: "Follow on X / Twitter",
      description: hasBonus("social_twitter")
        ? "Following confirmed"
        : "Follow @RangeFrenzy on X and confirm",
      reward: BONUS_AMOUNTS.social_twitter,
      status: hasBonus("social_twitter") ? "completed" : "available",
      actionLabel: hasBonus("social_twitter") ? undefined : "Follow & Confirm",
      actionHref: "https://x.com/rangefrenzy",
      onAction: () => handleSocialConfirm("twitter"),
      actionLoading: actionLoading["social_twitter"] ?? false,
    },
    {
      id: "social-telegram",
      source: "social_telegram",
      label: "Join Telegram",
      description: hasBonus("social_telegram")
        ? "Joined confirmed"
        : "Join the RangeFrenzy Telegram and confirm",
      reward: BONUS_AMOUNTS.social_telegram,
      status: hasBonus("social_telegram") ? "completed" : "available",
      actionLabel: hasBonus("social_telegram") ? undefined : "Join & Confirm",
      actionHref: "https://t.me/rangefrenzy",
      onAction: () => handleSocialConfirm("telegram"),
      actionLoading: actionLoading["social_telegram"] ?? false,
    },
  ];

  const totalEarned = bonuses.reduce((sum, b) => sum + b.amount_gd, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#07955F]" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <VerificationGate
        onVerified={() => {
          setVerified(true);
          setHasSkippedVerification(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* G$ Claim card — most dominant, first thing user sees */}
      <ClaimPage compact />

      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-[#07955F]/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07955F]/10">
            <GiftIcon className="h-6 w-6 text-[#07955F]" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Earn G$</h2>
            <p className="text-sm text-muted-foreground">Complete tasks to earn bonus rewards</p>
          </div>
        </div>
        {totalEarned > 0 && (
          <div className="mt-3 rounded-xl bg-[#07955F]/8 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#07955F]">
              Total earned
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">{totalEarned} G$</p>
          </div>
        )}
      </div>

      {/* Streak progress card */}
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Award01Icon className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold">Daily Streak</p>
              <p className="text-xs text-muted-foreground">Bet or claim G$ daily</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">{streak}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">days</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
            style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>Day 1</span>
          <span className={cn(streak >= 7 && "text-amber-600 font-semibold")}>7 days — 25 G$</span>
          <span className={cn(streak >= 30 && "text-amber-600 font-semibold")}>30 days — 100 G$</span>
        </div>
        <button
          type="button"
          onClick={handleDailyCheckIn}
          disabled={streakLoading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {streakLoading ? (
            <span className="flex items-center gap-2">
              <Loading03Icon className="h-4 w-4 animate-spin" />
              Checking in…
            </span>
          ) : (
            "☕ Check In"
          )}
        </button>
        {streakMsg && (
          <p className="mt-2 text-center text-xs font-medium text-amber-700">{streakMsg}</p>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tasks
        </p>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: TaskState }) {
  const isDone = task.status === "completed";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition",
        isDone
          ? "border-border/60 bg-muted/30 opacity-70"
          : "border-border bg-card shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isDone && <CheckmarkCircle01Icon className="h-4 w-4 shrink-0 text-[#07955F]" />}
            <p className={cn("font-semibold", isDone && "text-muted-foreground line-through")}>
              {task.label}
            </p>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>
        </div>
        {task.reward > 0 && !isDone && (
          <span className="shrink-0 rounded-full bg-[#07955F]/10 px-3 py-1 text-xs font-bold text-[#07955F] tabular-nums">
            +{task.reward} G$
          </span>
        )}
      </div>

      {/* Streak sub-tasks */}
      {task.source === "streak_7" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { source: "streak_7" as BonusSource, label: "7-Day Streak", reward: BONUS_AMOUNTS.streak_7, streak: 7 },
            { source: "streak_30" as BonusSource, label: "30-Day Streak", reward: BONUS_AMOUNTS.streak_30, streak: 30 },
          ].map((ms) => {
            const done = task.status === "completed" && task.source === ms.source;
            return (
              <div
                key={ms.source}
                className={cn(
                  "rounded-xl border p-3 text-center transition",
                  done
                    ? "border-border/60 bg-muted/30 opacity-60"
                    : "border-border bg-muted/30"
                )}
              >
                <p className={cn("text-xs font-semibold", done && "text-muted-foreground line-through")}>
                  {ms.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[#07955F]">
                  +{ms.reward} G$
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Action button */}
      {!isDone && task.actionLabel && (
        <div className="mt-3 flex gap-2">
          {task.actionHref && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => window.open(task.actionHref, "_blank")}
            >
              <Link03Icon className="mr-1.5 h-4 w-4" />
              Open
            </Button>
          )}
          <Button
            type="button"
            className={cn("flex-1 rounded-xl", task.actionHref ? "" : "w-full")}
            disabled={task.actionLoading}
            onClick={task.onAction}
          >
            {task.actionLoading ? (
              <span className="flex items-center gap-1.5">
                <Loading03Icon className="h-4 w-4 animate-spin" />
                Confirming…
              </span>
            ) : (
              task.actionLabel
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
