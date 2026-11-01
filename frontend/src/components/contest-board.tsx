"use client";

import { useEffect, useState } from "react";
import { Clock01Icon, Award01Icon } from "hugeicons-react";
import { useContest } from "@/lib/hooks/use-contest";
import { ordinal, phaseOf, prizeForRank, formatRemaining, type Contest, type Standing } from "@/lib/contest";
import { RankRow } from "@/components/rank-row";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const gd = (n: number) => `${n % 1 === 0 ? n : n.toFixed(2)} G$`;

/** What the signed-in player needs to know about their own place in a contest. */
export function describeStanding(contest: Contest, ranked: Standing[], qualifying: Standing[], address?: string) {
  if (!address) return null;
  const me = address.toLowerCase();
  const mine = ranked.find((s) => s.wallet === me);
  if (!mine) return { kind: "out" as const };
  if (mine.picks < contest.min_picks) {
    return { kind: "short" as const, need: contest.min_picks - mine.picks, staked: mine.staked };
  }
  const rank = qualifying.findIndex((s) => s.wallet === me) + 1;
  const prizeRanks = contest.prizes.map((p) => p.rank).sort((a, b) => a - b);
  const lastPrizeRank = prizeRanks[prizeRanks.length - 1] ?? 0;
  const target = rank > lastPrizeRank ? lastPrizeRank : rank - 1;
  const gap = target >= 1 && qualifying[target - 1] ? qualifying[target - 1].staked - mine.staked : null;
  return {
    kind: "in" as const,
    rank,
    staked: mine.staked,
    prize: prizeForRank(contest.prizes, rank),
    gap: gap !== null && gap > 0 ? { amount: gap + 0.01, toRank: target } : null,
  };
}

export function ContestBoard({ address }: { address?: string }) {
  const { contest, standings, loading, error, reload } = useContest();
  const now = useNow();

  if (loading) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading the contest…</span>
        <div aria-hidden className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-muted/70" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t load the contest.</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Award01Icon aria-hidden className="h-6 w-6 text-muted-foreground" />
        </span>
        <p className="font-display text-lg font-bold">No contest right now</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Contests run for a week with a G$ prize pool. Check back soon, or see the all-time board.
        </p>
      </div>
    );
  }

  const phase = phaseOf(contest, now);
  const qualifying = standings.filter((s) => s.picks >= contest.min_picks);
  const mine = describeStanding(contest, standings, qualifying, address);
  const prizes = [...contest.prizes].sort((a, b) => a.rank - b.rank);
  const remaining = new Date(contest.ends_at).getTime() - now;
  const untilStart = new Date(contest.starts_at).getTime() - now;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-xl font-bold text-balance">{contest.title}</h2>
        {contest.description && <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Prize pool</p>
            <p className="font-display text-3xl font-black tabular-nums tracking-tight">{gd(contest.prize_pool_gd)}</p>
          </div>
          <p className="flex items-center gap-1.5 pb-1 text-sm font-medium text-muted-foreground">
            <Clock01Icon aria-hidden className="h-4 w-4" />
            {phase === "upcoming"
              ? `Starts in ${formatRemaining(untilStart)}`
              : phase === "running"
                ? `Ends in ${formatRemaining(remaining)}`
                : phase === "paid"
                  ? "Prizes sent"
                  : "Ended, prizes coming"}
          </p>
        </div>
      </header>

      {prizes.length > 0 && (
        <ul
          aria-label="Prizes"
          className="grid divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card text-center"
          style={{ gridTemplateColumns: `repeat(${prizes.length}, minmax(0, 1fr))` }}
        >
          {prizes.map((p) => (
            <li key={p.rank} className="px-2 py-3">
              <p className="text-xs text-muted-foreground">{ordinal(p.rank)}</p>
              <p className="font-display text-base font-bold tabular-nums text-brand">{gd(p.amount)}</p>
            </li>
          ))}
        </ul>
      )}

      {mine && phase !== "upcoming" && (
        <section aria-label="Your standing" className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
          {mine.kind === "out" && (
            <>
              <p className="font-semibold">You&apos;re not in yet</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Stake on any live market to enter. You need {contest.min_picks} pick{contest.min_picks === 1 ? "" : "s"} to qualify.
              </p>
            </>
          )}
          {mine.kind === "short" && (
            <>
              <p className="font-semibold">
                {mine.need} more pick{mine.need === 1 ? "" : "s"} to qualify
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                You have staked {gd(mine.staked)} so far. Contests need {contest.min_picks} picks.
              </p>
            </>
          )}
          {mine.kind === "in" && (
            <>
              <p className="font-semibold">
                You&apos;re {ordinal(mine.rank)} with {gd(mine.staked)} staked
                {mine.prize > 0 && <span className="text-brand">, winning {gd(mine.prize)}</span>}
              </p>
              {mine.gap && phase === "running" && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Stake {gd(Math.ceil(mine.gap.amount))} more to reach {ordinal(mine.gap.toRank)}.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section aria-labelledby="standings">
        <h3 id="standings" className="mb-2 font-display text-base font-bold">
          Standings
        </h3>
        {qualifying.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {phase === "upcoming"
              ? "Standings appear when the contest starts."
              : "No one has qualified yet. Be the first to stake."}
          </p>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {qualifying.slice(0, 20).map((s, i) => (
              <RankRow
                key={s.wallet}
                rank={i + 1}
                name={s.username.startsWith("0x") ? s.username : `@${s.username}`}
                avatarUrl={s.avatarUrl}
                value={gd(s.staked)}
                detail={`${s.picks} picks`}
                badge={prizeForRank(contest.prizes, i + 1) > 0 ? gd(prizeForRank(contest.prizes, i + 1)) : undefined}
                isYou={!!address && s.wallet === address.toLowerCase()}
              />
            ))}
          </ol>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Ranked by G$ staked while the contest runs. You need {contest.min_picks} pick{contest.min_picks === 1 ? "" : "s"}{" "}
        to qualify. The team sends prizes to winners&apos; wallets after the contest ends.
      </p>
    </div>
  );
}
