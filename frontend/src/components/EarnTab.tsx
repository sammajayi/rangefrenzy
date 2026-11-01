"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckmarkCircle01Icon,
  FireIcon,
  Rocket01Icon,
  UserGroupIcon,
  NewTwitterIcon,
} from "hugeicons-react";
import { supabase } from "@/lib/supabase";
import type { BonusEarning, BonusSource } from "@/lib/supabase";
import { BONUS_AMOUNTS } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { ClaimPage } from "@/components/gooddollar/ClaimPage";

interface Props {
  address: string;
}

const MILESTONES: { days: number; source: BonusSource }[] = [
  { days: 7, source: "streak_7" },
  { days: 30, source: "streak_30" },
];

export function EarnTab({ address }: Props) {
  const isVerified = useAppStore((s) => s.isVerified);
  const setVerified = useAppStore((s) => s.setVerified);
  const setHasSkippedVerification = useAppStore((s) => s.setHasSkippedVerification);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [bonuses, setBonuses] = useState<BonusEarning[]>([]);
  const [betCount, setBetCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkedInToday = lastActiveDate === todayStr;

  const fetchData = useCallback(async () => {
    const [bonusRes, betRes, profileRes] = await Promise.all([
      supabase.from("bonus_earnings").select("*").eq("wallet_address", address.toLowerCase()),
      supabase.from("stakes").select("id", { count: "exact", head: true }).eq("wallet_address", address.toLowerCase()),
      supabase.from("profiles").select("current_streak, last_active_date").eq("wallet_address", address.toLowerCase()).maybeSingle(),
    ]);
    if (bonusRes.data) setBonuses(bonusRes.data as BonusEarning[]);
    setBetCount(betRes.count ?? 0);
    if (profileRes.data) {
      const p = profileRes.data as { current_streak?: number; last_active_date?: string | null };
      setStreak(p.current_streak ?? 0);
      setLastActiveDate(p.last_active_date ?? null);
    }
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (isVerified) fetchData();
  }, [fetchData, isVerified]);

  const hasBonus = (source: BonusSource) => bonuses.some((b) => b.source === source);
  const totalEarned = bonuses.reduce((sum, b) => sum + b.amount_gd, 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4" aria-hidden>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="h-44 animate-pulse rounded-3xl bg-muted/70" />
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

  const next = MILESTONES.find((m) => !hasBonus(m.source) && streak < m.days);
  const firstStakeDone = hasBonus("first_bet");

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-4">
      <ClaimPage compact />

      <StreakCard
        streak={streak}
        checkedInToday={checkedInToday}
        next={next ? { days: next.days, reward: BONUS_AMOUNTS[next.source] } : null}
        milestones={MILESTONES.map((m) => ({ ...m, reward: BONUS_AMOUNTS[m.source], done: hasBonus(m.source) }))}
      />

      <section aria-labelledby="missions">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="missions" className="font-display text-lg font-bold">
            Missions
          </h2>
          {totalEarned > 0 && (
            <p className="text-sm text-muted-foreground">
              Earned <span className="font-semibold tabular-nums text-foreground">{totalEarned} G$</span>
            </p>
          )}
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <Mission
            icon={Rocket01Icon}
            title="Place your first stake"
            detail={
              firstStakeDone
                ? "Bonus received"
                : betCount > 0
                  ? "Stake placed. Your bonus is on its way"
                  : "Pick a range on any live market"
            }
            reward={BONUS_AMOUNTS.first_bet}
            done={firstStakeDone}
          />
        </ul>

        <h3 className="mb-2 mt-5 text-sm font-medium text-muted-foreground">Coming soon</h3>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-dashed border-border">
          <Mission
            icon={UserGroupIcon}
            title="Invite a friend"
            detail="Earn when they place their first stake"
            reward={BONUS_AMOUNTS.referral_bonus}
            muted
          />
          <Mission
            icon={NewTwitterIcon}
            title="Follow RangeFrenzy on X"
            detail="Follow and confirm to earn"
            reward={BONUS_AMOUNTS.social_twitter}
            muted
          />
        </ul>
      </section>
    </div>
  );
}

function Mission({
  icon: Icon,
  title,
  detail,
  reward,
  done = false,
  muted = false,
}: {
  icon: typeof Rocket01Icon;
  title: string;
  detail: string;
  reward: number;
  done?: boolean;
  muted?: boolean;
}) {
  return (
    <li className={cn("flex items-center gap-3 p-4", muted && "opacity-60")}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          done ? "bg-brand text-white" : "bg-brand/10 text-brand"
        )}
      >
        {done ? <CheckmarkCircle01Icon aria-hidden className="h-5 w-5" /> : <Icon aria-hidden className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          done ? "text-muted-foreground line-through" : "text-brand"
        )}
      >
        +{reward} G$
      </span>
    </li>
  );
}

function StreakCard({
  streak,
  checkedInToday,
  next,
  milestones,
}: {
  streak: number;
  checkedInToday: boolean;
  next: { days: number; reward: number } | null;
  milestones: { days: number; reward: number; done: boolean }[];
}) {
  const left = next ? next.days - streak : 0;
  const pct = next ? Math.min(100, Math.round((streak / next.days) * 100)) : 100;

  return (
    <section aria-labelledby="streak" className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
            <FireIcon aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <h2 id="streak" className="font-display text-lg font-bold">
              {streak === 0 ? "Start a streak" : `${streak}-day streak`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {checkedInToday
                ? "Counted for today"
                : streak === 0
                  ? "Claim or stake today to begin"
                  : "Claim or stake today to keep it going"}
            </p>
          </div>
        </div>
      </div>

      <WeekStreak streak={streak} checkedInToday={checkedInToday} />

      <div className="mt-5">
        <div
          role="progressbar"
          aria-label="Progress to next streak reward"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {next ? (
            <>
              <span className="font-semibold tabular-nums text-foreground">
                {left} more day{left === 1 ? "" : "s"}
              </span>{" "}
              to earn <span className="font-semibold tabular-nums text-foreground">{next.reward} G$</span>
            </>
          ) : (
            "You have earned every streak reward."
          )}
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2">
        {milestones.map((m) => (
          <li
            key={m.days}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              m.done ? "border-brand/30 bg-brand/5" : "border-border bg-muted/30"
            )}
          >
            <p className="text-xs text-muted-foreground">{m.days} days</p>
            <p className={cn("font-display text-base font-bold tabular-nums", m.done ? "text-brand" : "text-foreground")}>
              {m.done ? "Earned" : `+${m.reward} G$`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// UTC-safe date helpers: mirror the streak API, which stores last_active_date
// as a UTC calendar date (new Date().toISOString().slice(0,10)).
function addDaysUTC(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + delta * 86400000).toISOString().slice(0, 10);
}

/**
 * Weekly streak strip: one cell per day, Su to Sa. A cell is filled only for days
 * inside the current streak; today gets a dashed ring until it counts.
 */
function WeekStreak({ streak, checkedInToday }: { streak: number; checkedInToday: boolean }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = new Date(`${todayStr}T00:00:00Z`).getUTCDay(); // 0 = Sun
  const weekStart = addDaysUTC(todayStr, -todayIdx);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));

  // The streak covers `streak` consecutive days ending on the last active day
  // (today if already counted, otherwise yesterday).
  const lastActive = checkedInToday ? todayStr : addDaysUTC(todayStr, -1);
  const active = new Set<string>();
  for (let k = 0; k < streak; k++) active.add(addDaysUTC(lastActive, -k));

  return (
    <ol aria-label="This week" className="mt-5 grid grid-cols-7 gap-1.5">
      {DOW.map((d, i) => {
        const inStreak = active.has(weekDates[i]);
        const isToday = i === todayIdx;
        return (
          <li key={d} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-xs font-medium", isToday ? "text-foreground" : "text-muted-foreground")}>{d}</span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border",
                inStreak
                  ? "border-amber-500 bg-amber-500 text-white"
                  : isToday
                    ? "border-dashed border-foreground/40"
                    : "border-border"
              )}
            >
              {inStreak && <FireIcon aria-hidden className="h-4 w-4" />}
            </span>
            <span className="sr-only">
              {inStreak ? "In your streak" : isToday ? "Today, not counted yet" : "No activity"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
