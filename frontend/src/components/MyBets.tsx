"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Stake } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "44787");
const EXPLORER = CHAIN_ID === 42220 ? "https://celoscan.io" : "https://alfajores.celoscan.io";

const STATUS_STYLES: Record<string, string> = {
  open:     "bg-blue-50 text-blue-700",
  won:      "bg-emerald-50 text-emerald-700",
  lost:     "bg-red-50 text-red-600",
  refunded: "bg-muted text-muted-foreground",
};

interface Props { address: string }

export function MyBets({ address }: Props) {
  const [bets, setBets] = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    supabase
      .from("stakes")
      .select("*, market:markets(title, asset, category, deadline, status, winning_value)")
      .eq("wallet_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBets((data as Stake[]) ?? []);
        setLoading(false);
      });
  }, [address]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!bets.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl mb-2">🎯</p>
        <p className="font-display text-base font-semibold">No bets yet</p>
        <p className="text-sm text-muted-foreground mt-1">Stake G$ on a market to get started.</p>
      </div>
    );
  }

  const totalStaked = bets.reduce((s, b) => s + parseFloat(b.amount_gd), 0);
  const won = bets.filter((b) => b.status === "won").length;
  const lost = bets.filter((b) => b.status === "lost").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Staked", value: `${totalStaked.toFixed(2)} G$` },
          { label: "Won",    value: String(won) },
          { label: "Lost",   value: String(lost) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-display text-sm font-bold mt-0.5 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <ul className="space-y-2">
        {bets.map((bet) => (
          <li key={bet.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary truncate">
                  {bet.market?.category ?? "Market"} · {bet.market?.asset ?? ""}
                </p>
                <p className="font-semibold text-sm mt-0.5 leading-tight">{bet.market?.title ?? bet.market_id}</p>
                <p className="text-xs text-muted-foreground mt-1">Range: <span className="font-medium text-foreground">{bet.range_label}</span></p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLES[bet.status] ?? "bg-muted text-muted-foreground")}>
                {bet.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums">{bet.amount_gd} G$ staked</span>
              {bet.payout_gd && (
                <span className="font-bold text-emerald-600 tabular-nums">+{bet.payout_gd} G$</span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {new Date(bet.created_at).toLocaleDateString()}
              </p>
              <a
                href={`${EXPLORER}/tx/${bet.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary underline-offset-4 hover:underline"
              >
                Tx ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
