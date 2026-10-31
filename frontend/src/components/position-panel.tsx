"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-4">
        Try again
      </button>
    </div>
  );
}

const money = (n: number) => n.toFixed(2);

export interface PositionPanelProps {
  symbol: string;
  /** Show the summary card (an open stake exists). */
  showCard: boolean;
  rangeLabel: string;
  staked: number;
  shares: number;
  /** What selling now would return, when selling is possible. */
  exitValue: number | null;
  /** Payout once resolved, when there is one. */
  payout: number | null;
  claimed: boolean;
  resolved: boolean;
  canSell: boolean;
  canClaim: boolean;
  canRefund: boolean;
  walletReady: boolean;
  sell: { step: string; error: string | null; onSell: () => void; onRetry: () => void };
  claim: { step: string; error: string | null; onClaim: () => void; onRefund: () => void; onRetry: () => void };
}

/** Everything about a stake you already hold: what it is worth, and the action that is available. */
export function PositionPanel(p: PositionPanelProps) {
  const delta = p.exitValue !== null ? p.exitValue - p.staked : 0;
  const lost = p.resolved && !p.canClaim && !p.claimed;

  return (
    <>
      {p.showCard && (
        <section aria-label="Your position" className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Your position</h4>
            <span className="rounded-md bg-card px-2 py-1 text-xs font-semibold tabular-nums">{p.rangeLabel}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">Staked</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {money(p.staked)} {p.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Shares</dt>
              <dd className="text-sm font-semibold tabular-nums">{p.shares.toFixed(4)}</dd>
            </div>
            {p.canSell && p.exitValue !== null && p.exitValue > 0 && (
              <div className="col-span-2 border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">Sell now for</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-bold tabular-nums">
                    {money(p.exitValue)} {p.symbol}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {money(delta)}
                  </span>
                </dd>
              </div>
            )}
            {p.payout !== null && p.payout > 0 && (
              <div className="col-span-2 border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">Payout</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-brand">
                  {money(p.payout)} {p.symbol}
                </dd>
              </div>
            )}
          </dl>
          {lost && (
            <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
              Your range didn&apos;t win this market.
            </p>
          )}
          {p.claimed && <p className="mt-3 border-t border-border pt-3 text-sm text-brand">Claimed.</p>}
        </section>
      )}

      {p.canSell &&
        (p.sell.step === "success" ? (
          <Notice title="Position sold" body="Your G$ is back in your wallet." />
        ) : (
          <div className="space-y-2">
            {p.sell.step === "error" && p.sell.error && <ErrorBox message={p.sell.error} onRetry={p.sell.onRetry} />}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10"
              disabled={!p.walletReady || p.sell.step === "selling"}
              onClick={p.sell.onSell}
            >
              {p.sell.step === "selling" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive/30 border-t-destructive" />
                  Selling…
                </span>
              ) : (
                "Sell position"
              )}
            </Button>
          </div>
        ))}

      {p.canClaim &&
        (p.claim.step === "success" ? (
          <Notice title="Winnings claimed" body={`${money(p.payout ?? 0)} ${p.symbol} sent to your wallet.`} />
        ) : (
          <div className="space-y-2">
            {p.claim.step === "error" && p.claim.error && (
              <ErrorBox message={p.claim.error} onRetry={p.claim.onRetry} />
            )}
            <Button type="button" className="h-11 w-full" disabled={p.claim.step === "claiming"} onClick={p.claim.onClaim}>
              {p.claim.step === "claiming" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Claiming…
                </span>
              ) : (
                `Claim ${money(p.payout ?? 0)} ${p.symbol}`
              )}
            </Button>
          </div>
        ))}

      {p.canRefund &&
        (p.claim.step === "success" ? (
          <Notice title="Refund received" body={`${money(p.staked)} ${p.symbol} returned to your wallet.`} />
        ) : (
          <div className="space-y-2">
            {p.claim.step === "error" && p.claim.error && (
              <ErrorBox message={p.claim.error} onRetry={p.claim.onRetry} />
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={p.claim.step === "claiming"}
              onClick={p.claim.onRefund}
            >
              {p.claim.step === "claiming" ? "Processing…" : `Refund ${money(p.staked)} ${p.symbol}`}
            </Button>
          </div>
        ))}
    </>
  );
}
