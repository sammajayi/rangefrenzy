"use client";

import { ArrowRight01Icon, Clock01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { formatRangeLabel, type OnChainMarket } from "@/lib/hooks/use-factory-markets";

interface Props {
  market: OnChainMarket;
  onSelect: (market: OnChainMarket) => void;
}

/** A market in the Play list: the question, where the money sits, and what is at stake. */
export function MarketCard({ market, onSelect }: Props) {
  const total = market.ranges.reduce((sum, r) => sum + r.totalStaked, 0n);
  const hasStakes = total > 0n;
  const shares = market.ranges.map((r) =>
    hasStakes ? Number((r.totalStaked * 1000n) / total) / 10 : 0
  );
  const leadIdx = hasStakes ? shares.indexOf(Math.max(...shares)) : -1;
  const lead = leadIdx >= 0 ? market.ranges[leadIdx] : null;
  const leadLabel = lead ? formatRangeLabel(lead) : "";
  const leadShare = leadIdx >= 0 ? Math.round(shares[leadIdx]) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(market)}
      className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-brand/40 active:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold uppercase tracking-wide text-brand">{market.categoryLabel}</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock01Icon aria-hidden className="h-3.5 w-3.5" />
          {market.deadlineLabel}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-balance font-display text-lg font-semibold leading-snug">
          {market.question}
        </p>
        {market.imageUrl && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            <img src={market.imageUrl} alt="" className="h-full w-full object-contain p-1" />
          </div>
        )}
      </div>

      <div>
        <div
          role="img"
          aria-label={
            hasStakes
              ? `Pool split across ${market.ranges.length} ranges. ${leadLabel} leads with ${leadShare}%.`
              : "No stakes yet"
          }
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        >
          {hasStakes ? (
            shares.map(
              (share, i) =>
                share > 0 && (
                  <span
                    key={market.ranges[i].index}
                    className={cn("h-full rounded-full", i === leadIdx ? "bg-brand" : "bg-foreground/20")}
                    style={{ flexGrow: share, flexBasis: 0 }}
                  />
                )
            )
          ) : (
            <span className="h-full flex-1 rounded-full bg-muted" />
          )}
        </div>
        <p className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          {hasStakes ? (
            <>
              <span className="min-w-0 truncate">
                <span className="font-medium tabular-nums text-foreground">{leadLabel}</span> leads with{" "}
                <span className="tabular-nums">{leadShare}%</span>
              </span>
              <span className="shrink-0 tabular-nums">{market.ranges.length} ranges</span>
            </>
          ) : (
            <span>No stakes yet. Pick a range and go first.</span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">
          {hasStakes ? (
            <>
              <span className="font-semibold tabular-nums text-foreground">{market.poolLabel}</span> pool
              {market.numStakers > 0 && (
                <span className="tabular-nums">
                  {" "}
                  · {market.numStakers} {market.numStakers === 1 ? "staker" : "stakers"}
                </span>
              )}
            </>
          ) : (
            "Empty pool"
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand">
          Stake
          <ArrowRight01Icon className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}
