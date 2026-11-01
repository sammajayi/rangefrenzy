"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  computeStandings,
  ordinal,
  phaseOf,
  prizeForRank,
  validateContest,
  type Contest,
  type Phase,
  type Prize,
  type StakeRow,
  type Standing,
} from "@/lib/contest";

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Value for a datetime-local input, in the admin's own timezone. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The next Monday 00:00 (local) and the Monday after it. */
function nextWeek(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

const PHASE_LABEL: Record<Phase, string> = {
  upcoming: "Scheduled",
  running: "Running",
  ended: "Ended, unpaid",
  paid: "Paid",
};
const PHASE_TONE: Record<Phase, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  running: "bg-emerald-100 text-emerald-700",
  ended: "bg-amber-100 text-amber-700",
  paid: "bg-muted text-muted-foreground",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ContestsSection() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apply = useCallback((data: unknown[] | null, error: { code?: string } | null) => {
    if (error) {
      setLoadError(
        error.code === "42P01" || error.code === "PGRST205"
          ? "The contests table doesn't exist yet. Run the contests block from supabase-schema.sql in the Supabase SQL editor."
          : "Couldn't load contests."
      );
    } else {
      setLoadError(null);
      setContests(((data ?? []) as Contest[]).map((c) => ({ ...c, prize_pool_gd: Number(c.prize_pool_gd) })));
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("contests").select("*").order("starts_at", { ascending: false });
    apply(data, error);
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("contests")
      .select("*")
      .order("starts_at", { ascending: false })
      .then(({ data, error }) => {
        if (!cancelled) apply(data, error);
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  return (
    <div className="space-y-8">
      <CreateContest onCreated={load} disabled={!!loadError && loadError.startsWith("The contests table")} />

      <section aria-labelledby="all-contests">
        <h2 id="all-contests" className="mb-3 font-display text-lg font-bold">
          All contests
        </h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        ) : loadError ? (
          <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </p>
        ) : contests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No contests yet. Create the first one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {contests.map((c) => (
              <ContestCard key={c.id} contest={c} onChanged={load} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateContest({ onCreated, disabled }: { onCreated: () => void; disabled: boolean }) {
  const preset = nextWeek();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(toLocalInput(preset.start));
  const [end, setEnd] = useState(toLocalInput(preset.end));
  const [pool, setPool] = useState("250");
  const [prizeText, setPrizeText] = useState(["120", "80", "50"]);
  const [minPicks, setMinPicks] = useState("3");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const prizes: Prize[] = prizeText
    .map((a, i) => ({ rank: i + 1, amount: Number(a) }))
    .filter((p) => p.amount > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const body = {
      title,
      description,
      starts_at: start ? new Date(start).toISOString() : "",
      ends_at: end ? new Date(end).toISOString() : "",
      prize_pool_gd: Number(pool),
      prizes,
      min_picks: Number(minPicks),
    };
    const problem = validateContest(body);
    if (problem) {
      setMessage({ ok: false, text: problem });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/contests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const err = res ? await res.json().catch(() => null) : null;
      setMessage({ ok: false, text: err?.error ?? "Couldn't reach the server. Try again." });
      return;
    }
    setMessage({ ok: true, text: "Contest created. Players see it on the Board." });
    setTitle("");
    setDescription("");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">New contest</h2>
        <button
          type="button"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => {
            const w = nextWeek();
            setStart(toLocalInput(w.start));
            setEnd(toLocalInput(w.end));
          }}
        >
          Fill next Monday to Monday
        </button>
      </div>

      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 45 contest" className={inputCls} maxLength={80} required />
      </Field>
      <Field label="Description (optional)" hint="One line players see under the title.">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Stake across any live market. Most G$ staked wins." className={inputCls} maxLength={140} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts">
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Ends">
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prize pool (G$)">
          <input type="number" min="0" inputMode="decimal" value={pool} onChange={(e) => setPool(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Minimum picks to qualify" hint="Stops one-stake entries from topping the board.">
          <input type="number" min="1" inputMode="numeric" value={minPicks} onChange={(e) => setMinPicks(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Prizes by rank (G$)</legend>
        <div className="grid grid-cols-3 gap-3">
          {prizeText.map((a, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-xs text-muted-foreground">{ordinal(i + 1)}</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={a}
                onChange={(e) => setPrizeText(prizeText.map((v, j) => (j === i ? e.target.value : v)))}
                className={inputCls}
              />
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Leave a rank empty to skip it. Prizes can&apos;t add up to more than the pool.</p>
      </fieldset>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-medium", message.ok ? "text-emerald-600" : "text-destructive")}>
          {message.text}
        </p>
      )}
      <Button type="submit" className="h-11 w-full" disabled={saving || disabled}>
        {saving ? "Creating…" : "Create contest"}
      </Button>
    </form>
  );
}

function ContestCard({ contest, onChanged }: { contest: Contest; onChanged: () => void }) {
  const phase = phaseOf(contest);
  const [open, setOpen] = useState(false);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || standings) return;
    supabase
      .from("stakes")
      .select("wallet_address, amount_gd, profile:profiles!stakes_wallet_address_fkey(username, avatar_url)")
      .gte("created_at", contest.starts_at)
      .lt("created_at", contest.ends_at)
      .neq("status", "refunded")
      .then(({ data, error: err }) => {
        if (err) setError("Couldn't load standings.");
        else setStandings(computeStandings((data ?? []) as unknown as StakeRow[]));
      });
  }, [open, standings, contest.starts_at, contest.ends_at]);

  const act = async (action: "end" | "paid") => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/contests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contest.id, action }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError("That didn't save. Try again.");
      return;
    }
    onChanged();
  };

  const winners = (standings ?? []).filter((s) => s.picks >= contest.min_picks);
  const copyWinners = () => {
    const rows = winners
      .map((s, i) => ({ s, prize: prizeForRank(contest.prizes, i + 1) }))
      .filter((r) => r.prize > 0)
      .map((r, i) => `${ordinal(i + 1)},${r.s.username},${r.s.wallet},${r.prize}`);
    void navigator.clipboard.writeText(["Rank,Username,Wallet,Prize (G$)", ...rows].join("\n"));
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", PHASE_TONE[phase])}>{PHASE_LABEL[phase]}</span>
          <p className="mt-1.5 font-display font-semibold">{contest.title}</p>
          <p className="text-xs text-muted-foreground">
            {fmt(contest.starts_at)} to {fmt(contest.ends_at)}. Pool {contest.prize_pool_gd}&nbsp;G$, {contest.min_picks} pick
            {contest.min_picks === 1 ? "" : "s"} to qualify.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {phase === "running" && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => act("end")}>
              End now
            </Button>
          )}
          {phase === "ended" && (
            <Button type="button" size="sm" disabled={busy} onClick={() => act("paid")}>
              Mark as paid
            </Button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {open ? "Hide standings" : phase === "ended" ? "Show winners" : "Show standings"}
      </button>

      {open && (
        <div className="mt-3">
          {!standings ? (
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          ) : winners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has qualified yet.</p>
          ) : (
            <>
              <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
                {winners.slice(0, 10).map((s, i) => (
                  <li key={s.wallet} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-5 text-center font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">@{s.username}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{s.wallet}</span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {s.staked.toFixed(2)}&nbsp;G$
                      {prizeForRank(contest.prizes, i + 1) > 0 && (
                        <span className="block text-xs font-semibold text-emerald-600">wins {prizeForRank(contest.prizes, i + 1)}&nbsp;G$</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={copyWinners} className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Copy winners and wallets
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
