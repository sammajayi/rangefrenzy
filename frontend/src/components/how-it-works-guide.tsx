"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A made-up market, so the guide can show the idea without touching live data. */
const EXAMPLE = {
  question: "How many goals in the opening match?",
  ranges: [
    { label: "0 to 1", staked: 40 },
    { label: "2 to 3", staked: 110 },
    { label: "4 to 5", staked: 35 },
    { label: "6+", staked: 15 },
  ],
};
const AMOUNTS = [5, 10, 25];

/** Simplified pooled payout: winners split the whole pool in proportion to what they staked. */
function examplePayout(rangeIdx: number, stake: number) {
  const pool = EXAMPLE.ranges.reduce((s, r) => s + r.staked, 0) + stake;
  const inRange = EXAMPLE.ranges[rangeIdx].staked + stake;
  return (pool * stake) / inRange;
}

interface Props {
  onClose: () => void;
}

const STEPS = ["Pick a range", "Choose your stake", "Win or sell"] as const;

export function HowItWorksGuide({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [range, setRange] = useState<number | null>(null);
  const [amount, setAmount] = useState(10);
  const last = step === STEPS.length - 1;
  const payout = range !== null ? examplePayout(range, amount) : null;

  const canNext = step !== 0 || range !== null;

  return (
    <Modal title="How RangeFrenzy works" onClose={onClose} sheet z="z-[70]" className="rounded-t-3xl bg-card p-5 sm:rounded-3xl">
      <div className="flex items-center justify-between gap-3">
        <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s} aria-hidden className={cn("h-1.5 w-8 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-muted")} />
          ))}
        </ol>
        <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Skip
        </button>
      </div>

      <h2 className="mt-5 font-display text-2xl font-bold">{STEPS[step]}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {step === 0 && "Every market asks for a number. You back the range you think it lands in."}
        {step === 1 && "Stake G$ on that range. The more of the pool sits elsewhere, the more you can win."}
        {step === 2 && "If the result lands in your range, you share the pool. You can also sell before the market closes."}
      </p>

      <p className="mt-5 text-xs font-medium text-muted-foreground">Example only. Not a live market.</p>
      <p className="mt-1 font-display text-base font-semibold">{EXAMPLE.question}</p>

      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ranges">
        {EXAMPLE.ranges.map((r, i) => (
          <button
            key={r.label}
            type="button"
            role="radio"
            aria-checked={range === i}
            onClick={() => setRange(i)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition active:scale-[0.98]",
              range === i ? "border-brand bg-brand/10" : "border-border bg-card hover:border-brand/40"
            )}
          >
            <span className="block text-sm font-semibold tabular-nums">{r.label}</span>
            <span className="block text-xs text-muted-foreground tabular-nums">{r.staked} G$ staked</span>
          </button>
        ))}
      </div>

      {step >= 1 && (
        <div className="mt-4 flex items-center gap-2" role="radiogroup" aria-label="Stake amount">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={amount === a}
              onClick={() => setAmount(a)}
              className={cn(
                "h-10 flex-1 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-[0.98]",
                amount === a ? "border-brand bg-brand/10" : "border-border hover:border-brand/40"
              )}
            >
              {a} G$
            </button>
          ))}
        </div>
      )}

      {step >= 1 && payout !== null && (
        <p aria-live="polite" className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
          Stake <span className="font-semibold tabular-nums">{amount} G$</span> on{" "}
          <span className="font-semibold">{EXAMPLE.ranges[range!].label}</span>. If it lands there, you would get about{" "}
          <span className="font-semibold tabular-nums text-brand">{payout.toFixed(1)} G$</span>. If not, you lose the stake.
        </p>
      )}
      {step === 2 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Simplified example. Real payouts depend on the live pool when the market closes.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-11" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button type="button" className="h-11 flex-1" disabled={!canNext} onClick={() => (last ? onClose() : setStep(step + 1))}>
          {last ? "Start playing" : canNext ? "Next" : "Pick a range to continue"}
        </Button>
      </div>
    </Modal>
  );
}
