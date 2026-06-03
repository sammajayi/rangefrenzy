"use client";

import { useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ArrowDownLeft, ArrowUpRight, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CELO_TOKEN, getUsdmTokenAddress } from "@/lib/celo-balances";
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

/** Demo ledger until on-chain history is wired */
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

function fmtBal(loading: boolean, formatted?: string, decimals = 4) {
  if (loading) return "…";
  const n = parseFloat(formatted ?? "0");
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

type Props = {
  storedUsername: string | null;
  onSignOut?: () => void;
};

export function MinipayProfileView({ storedUsername, onSignOut }: Props) {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);

  const celo = useBalance({ address, query: { enabled: !!address } });
  const cusd = useBalance({
    address,
    token: CELO_TOKEN.cUSD,
    query: { enabled: !!address },
  });
  const usdc = useBalance({
    address,
    token: CELO_TOKEN.USDC,
    query: { enabled: !!address },
  });

  const usdmAddress = getUsdmTokenAddress();

  const stats = useMemo(
    () => [
      { label: "Total P&L", value: "$0.00" },
      { label: "Open positions", value: "0" },
      { label: "Closed", value: "0" },
      { label: "Win rate", value: "—" },
    ],
    []
  );

  if (!isConnected || !address) return null;

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const displayName = storedUsername
    ? storedUsername.charAt(0).toUpperCase() + storedUsername.slice(1)
    : "Player";
  const handle = storedUsername ? `@${storedUsername}` : "@player";

  const copy = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100dvh-8rem)] rounded-t-3xl bg-white pb-8 pt-1 text-foreground shadow-sm ring-1 ring-border">
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {(storedUsername ?? "PK").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground">{handle}</p>
              <button
                type="button"
                onClick={copy}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {short}
                <Copy className="h-3 w-3" />
                {copied ? <span className="text-primary">Copied</span> : null}
              </button>
            </div>
          </div>
          {onSignOut ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-border"
              onClick={onSignOut}
              aria-label="Disconnect"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : null}
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
            <BalanceRow
              label="CELO"
              sub="Native"
              value={fmtBal(celo.isLoading, celo.data?.formatted)}
            />
            <BalanceRow
              label="cUSD"
              sub="Celo Dollar"
              value={fmtBal(cusd.isLoading, cusd.data?.formatted)}
            />
            {usdmAddress ? (
              <UsdmBalanceRow address={address} token={usdmAddress} />
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">USDm</p>
                  
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  
                </span>
              </div>
            )}
            <BalanceRow
              label="USDC"
              sub="Bridged"
              value={fmtBal(usdc.isLoading, usdc.data?.formatted)}
            />
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transaction history
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Debits (stakes) and credits (winnings, refunds). Live data will sync
            when markets are on-chain.
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
                      : "bg-emerald-500/10 text-emerald-600"
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
                      <p className="text-xs text-muted-foreground">{tx.detail}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          tx.kind === "debit"
                            ? "text-red-600"
                            : "text-emerald-600"
                        )}
                      >
                        {tx.kind === "debit" ? "−" : "+"}
                        {tx.amount} {tx.token}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tx.at}</p>
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

function UsdmBalanceRow({
  address,
  token,
}: {
  address: `0x${string}`;
  token: `0x${string}`;
}) {
  const { data, isLoading } = useBalance({ address, token });
  return (
    <BalanceRow
      label="USDm"
      sub="Configured token"
      value={fmtBal(isLoading, data?.formatted)}
    />
  );
}
