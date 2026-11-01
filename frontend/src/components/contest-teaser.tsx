"use client";

import { ArrowRight01Icon, Award01Icon } from "hugeicons-react";
import { useContest } from "@/lib/hooks/use-contest";
import { ordinal, phaseOf } from "@/lib/contest";
import { describeStanding } from "@/components/contest-board";

/** One tappable row that says where you stand in the running contest. Renders nothing otherwise. */
export function ContestTeaser({ address, onOpen }: { address?: string; onOpen?: () => void }) {
  const { contest, standings } = useContest();
  if (!contest || !onOpen || phaseOf(contest) !== "running") return null;

  const qualifying = standings.filter((s) => s.picks >= contest.min_picks);
  const mine = describeStanding(contest, standings, qualifying, address);
  const line =
    mine?.kind === "in"
      ? `You're ${ordinal(mine.rank)} this week`
      : mine?.kind === "short"
        ? `${mine.need} more pick${mine.need === 1 ? "" : "s"} to qualify`
        : "Stake on any market to enter";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-brand/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Award01Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{contest.title}</span>
        <span className="block text-sm text-muted-foreground">{line}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold tabular-nums text-brand">{contest.prize_pool_gd}&nbsp;G$</span>
        <span className="block text-xs text-muted-foreground">prize pool</span>
      </span>
      <ArrowRight01Icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
