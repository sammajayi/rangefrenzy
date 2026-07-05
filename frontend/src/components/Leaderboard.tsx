"use client";

import { useMemo, useState } from "react";
import { MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { useLeaderboard, type LeaderboardEntry } from "@/lib/hooks/use-leaderboard";

const PODIUM_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-gray-100 border-gray-400 text-gray-700",
  "bg-orange-100 border-orange-400 text-orange-800",
];
const PODIUM_ICONS = [MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon];

const SORTS = [
  { key: "wins", label: "By Wins" },
  { key: "volume", label: "By Volume" },
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
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  const initial = entry.username.charAt(0).toUpperCase();
  if (entry.avatar_url) {
    return <img src={entry.avatar_url} alt={entry.username} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  return <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[#07955F]/10 font-bold text-[#07955F]`}>{initial}</div>;
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
          className="mt-2 text-sm font-semibold text-[#07955F] underline-offset-4 hover:underline"
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
        <p className="text-sm text-muted-foreground mt-2">No bets yet — be the first to stake!</p>
      </div>
    );
  }

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Top performers</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-muted/40 p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                sort === s.key
                  ? "bg-[#07955F] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {top3.map((entry, i) => {
          const Icon = PODIUM_ICONS[i];
          const isYou = address && entry.address.toLowerCase() === address.toLowerCase();
          const winRate = winRateOf(entry);
          return (
            <div
              key={entry.address}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center",
                PODIUM_COLORS[i],
                isYou && "ring-2 ring-[#07955F] ring-offset-1"
              )}
            >
              <Icon className="h-6 w-6" />
              <Avatar entry={entry} size="md" />
              <div>
                <p className="text-xs font-bold leading-tight">@{entry.username}</p>
                <p className="text-sm font-bold tabular-nums">{entry.wins}W</p>
                <p className="text-[10px] opacity-70">{winRate === 0 ? "—" : `${Math.round(winRate * 100)}%`} win</p>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2 text-right">Staked</th>
                <th className="px-3 py-2 text-right">Win %</th>
                <th className="px-3 py-2 text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row, i) => {
                const isYou = address && row.address.toLowerCase() === address.toLowerCase();
                const winRate = winRateOf(row);
                return (
                  <tr key={row.address} className={cn("border-t border-border bg-card", isYou && "bg-[#07955F]/5")}>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{i + 4}</td>
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar entry={row} size="sm" />
                        @{row.username}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{num(row.totalStaked).toFixed(0)} G$</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {winRate === 0 ? "—" : `${Math.round(winRate * 100)}%`}
                    </td>
                    <td className="px-3 py-3 text-right">
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
