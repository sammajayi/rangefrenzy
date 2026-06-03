"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TxRow = {
  id: string;
  kind: "debit" | "credit";
  title: string;
  detail: string;
  amount: string;
  token: string;
  at: string;
};

const MOCK_TX_HISTORY: TxRow[] = [
  {
    id: "1",
    kind: "debit",
    title: "Stake",
    detail: "BTC range · 2% – 5%",
    amount: "25.00",
    token: "USDC",
    at: "Today, 09:14",
  },
  {
    id: "2",
    kind: "credit",
    title: "Winnings",
    detail: "ETH range resolved in your band",
    amount: "42.80",
    token: "cUSD",
    at: "Yesterday, 18:02",
  },
  {
    id: "3",
    kind: "debit",
    title: "Stake",
    detail: "CELO range · 3% – 8%",
    amount: "10.00",
    token: "USDm",
    at: "Mon, 14 Apr",
  },
];

export function StaticProfileView() {
  const displayName = "Player";
  const handle = "@player";

  const stats = [
    { label: "Total P&L", value: "$0.00" },
    { label: "Open positions", value: "0" },
    { label: "Closed", value: "0" },
    { label: "Win rate", value: "—" },
  ];

  return (
    <div className="min-h-[calc(100dvh-8rem)] rounded-t-3xl bg-white pb-8 pt-1 text-foreground shadow-sm ring-1 ring-border">
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              PK
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground">{handle}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-muted/30 px-3 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-base font-bold tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Wallet balances (Celo)
          </h3>
          <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
            <BalanceRow label="CELO" sub="Native" value="0.00" />
            <BalanceRow label="cUSD" sub="Celo Dollar" value="0.00" />
            <BalanceRow label="USDC" sub="Bridged" value="0.00" />
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transaction history
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Debits (stakes) and credits (winnings, refunds).
          </p>
          <ul className="mt-3 space-y-2">
            {MOCK_TX_HISTORY.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    tx.kind === "debit"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-emerald-500/10 text-emerald-600",
                  )}
                >
                  {tx.kind === "debit" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{tx.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.detail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          tx.kind === "debit"
                            ? "text-red-600"
                            : "text-emerald-600",
                        )}
                      >
                        {tx.kind === "debit" ? "−" : "+"}
                        {tx.amount} {tx.token}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.at}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {tx.kind === "debit" ? "Debit" : "Credit"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BalanceRow({
  label,
  sub,
  value,
}: {
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
