"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLeaderboard, type LeaderboardEntry } from "@/lib/hooks/use-leaderboard";
import { RankRow } from "@/components/rank-row";

/** Usernames that are really wallet addresses (full or already shortened) read as one short line, without "@". */
function handleOf(username: string): string {
  const short = /^0x([0-9a-f]{4})[.…]+([0-9a-f]{4})$/i.exec(username);
  if (short) return `0x${short[1]}…${short[2]}`;
  if (/^0x[0-9a-f]{8,}$/i.test(username)) return `${username.slice(0, 6)}…${username.slice(-4)}`;
  return `@${username}`;
}

const SORTS = [
  { key: "wins", label: "Wins" },
  { key: "volume", label: "Staked" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function num(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

function describe(entry: LeaderboardEntry, sort: SortKey) {
  const rate = entry.totalBets ? Math.round((entry.wins / entry.totalBets) * 100) : null;
  if (sort === "wins") {
    return {
      value: `${entry.wins} ${entry.wins === 1 ? "win" : "wins"}`,
      detail: rate === null ? "No settled stakes" : `${rate}% win rate`,
    };
  }
  return {
    value: `${num(entry.totalStaked).toFixed(0)} G$`,
    detail: `${entry.totalBets} ${entry.totalBets === 1 ? "stake" : "stakes"}`,
  };
}

export function Leaderboard({ address }: { address?: string }) {
  const { data: leaders, isLoading, isError, refetch } = useLeaderboard();
  const [sort, setSort] = useState<SortKey>("wins");

  const sorted = useMemo(() => {
    if (!leaders) return [];
    const copy = [...leaders];
    copy.sort(
      sort === "wins"
        ? (a, b) => b.wins - a.wins || num(b.totalStaked) - num(a.totalStaked)
        : (a, b) => num(b.totalStaked) - num(a.totalStaked)
    );
    return copy;
  }, [leaders, sort]);

  if (isLoading) {
    return (
      <div role="status" className="space-y-2">
        <span className="sr-only">Loading the leaderboard…</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden className="h-16 animate-pulse rounded-2xl bg-muted/70" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t load the leaderboard.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-lg font-bold">No one is ranked yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Place a stake to be the first on the board.</p>
      </div>
    );
  }

  const myIndex = address ? sorted.findIndex((e) => e.address.toLowerCase() === address.toLowerCase()) : -1;
  const top = sorted.slice(0, 20);
  const meOutsideTop = myIndex >= top.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">All time</h2>
        <div role="group" aria-label="Rank by" className="flex gap-1 rounded-full border border-border bg-muted/40 p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                sort === s.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {top.map((entry, i) => {
          const d = describe(entry, sort);
          return (
            <RankRow
              key={entry.address}
              rank={i + 1}
              name={handleOf(entry.username)}
              avatarUrl={entry.avatar_url}
              value={d.value}
              detail={d.detail}
              isYou={i === myIndex}
            />
          );
        })}
      </ol>

      {meOutsideTop && (
        <ol className="mt-3 overflow-hidden rounded-2xl border border-brand/30 bg-card">
          <RankRow
            rank={myIndex + 1}
            name={handleOf(sorted[myIndex].username)}
            avatarUrl={sorted[myIndex].avatar_url}
            value={describe(sorted[myIndex], sort).value}
            detail={describe(sorted[myIndex], sort).detail}
            isYou
          />
        </ol>
      )}
    </div>
  );
}
