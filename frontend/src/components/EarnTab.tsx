"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GiftIcon,
  CheckmarkCircle01Icon,
  Loading03Icon,
  Link03Icon,
  FireIcon,
  Rocket01Icon,
  UserGroupIcon,
  NewTwitterIcon,
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
  icon: typeof GiftIcon;
  accent: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => Promise<void>;
  actionLoading?: boolean;
  comingSoon?: boolean;
}

type Platform = "twitter" | "telegram";

export function EarnTab({ address }: Props) {
  const isVerified = useAppStore((s) => s.isVerified);
  const setVerified = useAppStore((s) => s.setVerified);
  const setHasSkippedVerification = useAppStore((s) => s.setHasSkippedVerification);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [bonuses, setBonuses] = useState<BonusEarning[]>([]);
  const [betCount, setBetCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakMsg, setStreakMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const checkedInToday = lastActiveDate === todayStr;

  const fetchData = useCallback(async () => {
    const [bonusRes, betRes, profileRes] = await Promise.all([
      supabase.from("bonus_earnings").select("*").eq("wallet_address", address.toLowerCase()),
      supabase.from("stakes").select("id", { count: "exact", head: true }).eq("wallet_address", address.toLowerCase()),
      supabase.from("profiles").select("current_streak, last_active_date, referred_by").eq("wallet_address", address.toLowerCase()).maybeSingle(),
    ]);
    if (bonusRes.data) setBonuses(bonusRes.data as BonusEarning[]);
    setBetCount(betRes.count ?? 0);
    if (profileRes.data) {
      setStreak((profileRes.data as any).current_streak ?? 0);
      setLastActiveDate((profileRes.data as any).last_active_date ?? null);
      setReferredBy((profileRes.data as any).referred_by ?? null);
    }
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (isVerified) fetchData();
  }, [fetchData, isVerified]);

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
      if (data.error) {
        setStreakMsg("Something went wrong");
      } else {
        setStreak(data.streak);
        setLastActiveDate(todayStr);
        if (data.bonuses_credited?.length) {
          setStreakMsg(`+${data.bonuses_credited.length} bonus${data.bonuses_credited.length > 1 ? "es" : ""} earned!`);
        } else {
          setStreakMsg(data.streak > 1 ? `${data.streak}-day streak!` : "Day 1 — let's go!");
        }
        // Refresh bonus data but keep streak from API response
        const [bonusRes] = await Promise.all([
          supabase.from("bonus_earnings").select("*").eq("wallet_address", address.toLowerCase()),
        ]);
        if (bonusRes.data) setBonuses(bonusRes.data as BonusEarning[]);
      }
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
      icon: Rocket01Icon,
      accent: "from-brand to-emerald-400",
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
      icon: FireIcon,
      accent: "from-amber-400 to-orange-500",
    },
    {
      id: "referral",
      source: "referral_bonus",
      label: "Referral",
      description: referredBy
        ? `You were referred by ${referredBy.slice(0, 6)}…`
        : "Share your link and earn when friends place their first bet",
      reward: BONUS_AMOUNTS.referral_bonus,
      status: hasBonus("referral_bonus") || hasBonus("referral_reward") ? "completed" : "available",
      comingSoon: true,
      icon: UserGroupIcon,
      accent: "from-sky-400 to-blue-500",
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
      comingSoon: true,
      icon: NewTwitterIcon,
      accent: "from-neutral-700 to-neutral-900",
    },
  ];

  const totalEarned = bonuses.reduce((sum, b) => sum + b.amount_gd, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
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
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30">
            <GiftIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Earn G$</h2>
            <p className="text-sm text-muted-foreground">Complete tasks to earn bonus rewards</p>
          </div>
        </div>
        {totalEarned > 0 && (
          <div className="relative mt-3 rounded-xl bg-white/70 px-4 py-2.5 ring-1 ring-brand/15">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              Total earned
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">{totalEarned} G$</p>
          </div>
        )}
      </div>

      {/* Streak progress card */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
              <FireIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Daily Streak</p>
              <p className="text-xs text-muted-foreground">Bet or claim G$ daily</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums text-amber-700">{streak}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">days</p>
          </div>
        </div>
        <div className="relative mt-3 h-2.5 rounded-full bg-amber-100/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all"
            style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
          />
        </div>
        <div className="relative mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>Day 1</span>
          <span className={cn(streak >= 7 && "text-amber-600 font-semibold")}>7 days — 25 G$</span>
          <span className={cn(streak >= 30 && "text-amber-600 font-semibold")}>30 days — 100 G$</span>
        </div>
        <button
          type="button"
          onClick={handleDailyCheckIn}
          disabled={checkedInToday || streakLoading}
          className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/30 transition hover:shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:hover:brightness-100"
        >
          {streakLoading ? (
            <span className="flex items-center gap-2">
              <Loading03Icon className="h-4 w-4 animate-spin" />
              Checking in…
            </span>
          ) : checkedInToday ? (
            <span className="flex items-center gap-2">
              <CheckmarkCircle01Icon className="h-4 w-4" />
              Checked In
            </span>
          ) : (
            "Check In"
          )}
        </button>
        {streakMsg && (
          <p className="relative mt-2 text-center text-xs font-medium text-amber-700">{streakMsg}</p>
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
  const Icon = task.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition",
        isDone
          ? "border-border/60 bg-muted/30 opacity-70"
          : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
              isDone ? "from-muted-foreground/40 to-muted-foreground/40" : task.accent
            )}
          >
            {isDone ? <CheckmarkCircle01Icon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className={cn("font-semibold", isDone && "text-muted-foreground line-through")}>
              {task.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>
          </div>
        </div>
        {task.reward > 0 && !isDone && (
          <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand tabular-nums">
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
                <p className="mt-1 text-lg font-bold tabular-nums text-brand">
                  +{ms.reward} G$
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Coming Soon badge */}
      {!isDone && task.comingSoon && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Coming Soon
          </span>
        </div>
      )}

      {/* Action button */}
      {!isDone && !task.comingSoon && task.actionLabel && (
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
