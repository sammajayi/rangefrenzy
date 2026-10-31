"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLeaderboard, type LeaderboardEntry } from "@/lib/hooks/use-leaderboard";

/** Usernames that are really wallet addresses (full or already shortened) read as one short line, without "@". */
function handleOf(username: string): string {
  const short = /^0x([0-9a-f]{4})[.…]+([0-9a-f]{4})$/i.exec(username);
  if (short) return `0x${short[1]}…${short[2]}`;
  if (/^0x[0-9a-f]{8,}$/i.test(username)) return `${username.slice(0, 6)}…${username.slice(-4)}`;
  return `@${username}`;
}

const SORTS = [
  { key: "wins", label: "By wins" },
  { key: "volume", label: "By volume" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function num(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

function winRateOf(entry: LeaderboardEntry): number {
  return entry.totalBets ? entry.wins / entry.totalBets : 0;
}

interface Props { address?: string }

function Avatar({ entry, size }: { entry: LeaderboardEntry; size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-[11px]" : "h-9 w-9 text-sm";
  const initial = entry.username.charAt(0).toUpperCase();
  if (entry.avatar_url) {
    return <img src={entry.avatar_url} alt={entry.username} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  return <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-brand/10 font-bold text-brand`}>{initial}</div>;
}

function PnlBadge({ value }: { value: number }) {
  return (
    <span className={cn("tabular-nums", value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-muted-foreground")}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-3">
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="mt-2 h-3 w-20 rounded bg-muted" />
    </div>
  );
}

export function Leaderboard({ address }: Props) {
  const { data: leaders, isLoading, isError, refetch } = useLeaderboard();
  const [sort, setSort] = useState<SortKey>("wins");

  const sorted = useMemo(() => {
    if (!leaders) return [];
    const copy = [...leaders];
    if (sort === "wins") {
      copy.sort((a, b) => b.wins - a.wins || num(b.totalStaked) - num(a.totalStaked));
    } else {
      copy.sort((a, b) => num(b.totalStaked) - num(a.totalStaked));
    }
    return copy;
  }, [leaders, sort]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load the leaderboard.</p>
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
        <p className="font-display text-xl font-bold">Leaderboard</p>
        <p className="text-sm text-muted-foreground mt-2">No stakes yet. Be the first to stake.</p>
      </div>
    );
  }

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Top performers</h2>
          <p className="text-sm text-muted-foreground">
            {sort === "wins" ? "Ranked by wins" : "Ranked by G$ staked"}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-muted/40 p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                sort === s.key
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <ol className="mb-4 grid grid-cols-3 gap-2">
        {top3.map((entry, i) => {
          const isYou = address && entry.address.toLowerCase() === address.toLowerCase();
          const winRate = winRateOf(entry);
          return (
            <li
              key={entry.address}
              className={cn(
                "flex min-w-0 flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center",
                i === 0 ? "border-brand/50" : "border-border",
                isYou && "ring-2 ring-brand ring-offset-1"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                  i === 0 ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <Avatar entry={entry} size="md" />
              <div className="w-full min-w-0">
                <p className="truncate text-xs font-semibold">{handleOf(entry.username)}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">
                  {entry.wins} {entry.wins === 1 ? "win" : "wins"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {winRate === 0 ? "n/a" : `${Math.round(winRate * 100)}%`} win rate
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">User</th>
                <th className="whitespace-nowrap px-2 py-2 text-right">Staked</th>
                <th className="whitespace-nowrap px-2 py-2 text-right">Win %</th>
                <th className="px-2 py-2 text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row, i) => {
                const isYou = address && row.address.toLowerCase() === address.toLowerCase();
                const winRate = winRateOf(row);
                return (
                  <tr key={row.address} className={cn("border-t border-border bg-card", isYou && "bg-brand/5")}>
                    <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{i + 4}</td>
                    <td className="max-w-[7.5rem] px-2 py-3 font-medium">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar entry={row} size="sm" />
                        <span className="truncate">{handleOf(row.username)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{num(row.totalStaked).toFixed(0)} G$</td>
                    <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                      {winRate === 0 ? "n/a" : `${Math.round(winRate * 100)}%`}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <PnlBadge value={num(row.realizedPnl)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
