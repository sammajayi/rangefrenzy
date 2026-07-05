"use client";

import { useMemo, useState } from "react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  SaleTag02Icon,
  Undo02Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";
import { useUserStakes } from "@/lib/hooks/use-user-stakes";
import type { StakeStatus } from "@/lib/subgraph-queries";
import { num, stakePnl, computeStakeStats } from "@/lib/stake-stats";

const EXPLORER = "https://celoscan.io";

const STATUS_META: Record<StakeStatus, { label: string; className: string; icon: typeof Clock01Icon }> = {
  OPEN:     { label: "Open",       className: "bg-blue-50 text-blue-700",        icon: Clock01Icon },
  WON:      { label: "Won",        className: "bg-emerald-50 text-emerald-700",  icon: CheckmarkCircle01Icon },
  LOST:     { label: "Lost",       className: "bg-red-50 text-red-600",          icon: Cancel01Icon },
  SOLD:     { label: "Sold early", className: "bg-amber-50 text-amber-700",      icon: SaleTag02Icon },
  REFUNDED: { label: "Refunded",   className: "bg-muted text-muted-foreground",  icon: Undo02Icon },
};

const FILTERS: { key: "ALL" | StakeStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
  { key: "SOLD", label: "Sold" },
  { key: "REFUNDED", label: "Refunded" },
];

interface Props { address: string }

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="mt-2 h-4 w-40 rounded bg-muted" />
      <div className="mt-3 h-3 w-full rounded bg-muted" />
    </div>
  );
}

export function MyBets({ address }: Props) {
  const { data: bets, isLoading, isError, refetch } = useUserStakes(address);
  const [filter, setFilter] = useState<"ALL" | StakeStatus>("ALL");

  const filtered = useMemo(() => {
    if (!bets) return [];
    return filter === "ALL" ? bets : bets.filter((b) => b.status === filter);
  }, [bets, filter]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load your bets.</p>
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

  if (!bets?.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl mb-2">🎯</p>
        <p className="font-display text-base font-semibold">No bets yet</p>
        <p className="text-sm text-muted-foreground mt-1">Stake G$ on a market to get started.</p>
      </div>
    );
  }

  const { totalStaked, won, lost, realizedPnl } = computeStakeStats(bets);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Staked", value: `${totalStaked.toFixed(2)} G$` },
          { label: "Won", value: String(won) },
          { label: "Lost", value: String(lost) },
          {
            label: "P&L",
            value: `${realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}`,
            className: realizedPnl > 0 ? "text-emerald-600" : realizedPnl < 0 ? "text-red-600" : undefined,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-2 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={cn("font-display text-sm font-bold mt-0.5 tabular-nums", s.className)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition border",
              filter === f.key
                ? "bg-[#07955F] text-white border-[#07955F] shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-[#07955F]/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No bets in this category.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((bet) => {
            const meta = STATUS_META[bet.status];
            const Icon = meta.icon;
            const pnl = stakePnl(bet);
            const settleAmount = bet.status === "SOLD" ? bet.proceeds : bet.payout;

            return (
              <li key={bet.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#07955F] truncate">
                      {bet.market?.categoryLabel ?? "Market"}
                    </p>
                    <p className="font-semibold text-sm mt-0.5 leading-tight">{bet.market?.question ?? "Unknown market"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: <span className="font-medium text-foreground">{bet.rangeLabel || `#${bet.rangeIndex}`}</span>
                    </p>
                  </div>
                  <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", meta.className)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold tabular-nums">{num(bet.amount).toFixed(2)} G$ staked</span>
                  {settleAmount != null && (
                    <span className="font-bold text-emerald-600 tabular-nums">+{num(settleAmount).toFixed(2)} G$</span>
                  )}
                </div>

                {pnl !== null && (
                  <p className={cn("mt-1 text-xs font-semibold tabular-nums", pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} G$ P&L
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(Number(bet.createdAt) * 1000).toLocaleDateString()}
                  </p>
                  <a
                    href={`${EXPLORER}/tx/${bet.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#07955F] underline-offset-4 hover:underline"
                  >
                    Tx ↗
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
