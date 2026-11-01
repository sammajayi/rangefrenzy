export interface Prize {
  rank: number;
  amount: number;
}

export type ContestStatus = "active" | "ended" | "paid";

export interface Contest {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  prize_pool_gd: number;
  prizes: Prize[];
  min_picks: number;
  status: ContestStatus;
}

export interface Standing {
  wallet: string;
  username: string;
  avatarUrl: string | null;
  staked: number;
  picks: number;
}

export interface StakeRow {
  wallet_address: string;
  amount_gd: string | null;
  profile?: { username?: string | null; avatar_url?: string | null } | null;
}

/** Where a contest is in its life, from its dates and stored status. */
export type Phase = "upcoming" | "running" | "ended" | "paid";

export function phaseOf(c: Pick<Contest, "starts_at" | "ends_at" | "status">, now = Date.now()): Phase {
  if (c.status === "paid") return "paid";
  if (now < new Date(c.starts_at).getTime()) return "upcoming";
  if (c.status === "ended" || now >= new Date(c.ends_at).getTime()) return "ended";
  return "running";
}

/** Group stakes into standings: most G$ staked first, then most picks. */
export function computeStandings(rows: StakeRow[]): Standing[] {
  const byWallet = new Map<string, Standing>();
  for (const r of rows) {
    const wallet = r.wallet_address.toLowerCase();
    const entry =
      byWallet.get(wallet) ??
      {
        wallet,
        username: r.profile?.username ?? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
        avatarUrl: r.profile?.avatar_url ?? null,
        staked: 0,
        picks: 0,
      };
    entry.staked += parseFloat(r.amount_gd ?? "0") || 0;
    entry.picks += 1;
    byWallet.set(wallet, entry);
  }
  return [...byWallet.values()].sort((a, b) => b.staked - a.staked || b.picks - a.picks);
}

export function prizeForRank(prizes: Prize[], rank: number): number {
  return prizes.find((p) => p.rank === rank)?.amount ?? 0;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "3d 4h", "5h 12m", "12m", or "Ended". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(m, 1)}m`;
}

/** Validates a contest the admin is about to create. Returns an error message, or null. */
export function validateContest(input: {
  title: string;
  starts_at: string;
  ends_at: string;
  prize_pool_gd: number;
  prizes: Prize[];
  min_picks: number;
}): string | null {
  if (!input.title.trim()) return "Give the contest a title.";
  const start = Date.parse(input.starts_at);
  const end = Date.parse(input.ends_at);
  if (Number.isNaN(start) || Number.isNaN(end)) return "Set a start and end time.";
  if (end <= start) return "The end must be after the start.";
  if (!(input.prize_pool_gd >= 0)) return "The prize pool can't be negative.";
  const ranks = input.prizes.map((p) => p.rank);
  if (new Set(ranks).size !== ranks.length) return "Each rank can only have one prize.";
  if (input.prizes.some((p) => !Number.isInteger(p.rank) || p.rank < 1 || !(p.amount > 0)))
    return "Prizes need a rank of 1 or more and an amount above zero.";
  const total = input.prizes.reduce((s, p) => s + p.amount, 0);
  if (total > input.prize_pool_gd) return `Prizes add up to ${total} G$, more than the ${input.prize_pool_gd} G$ pool.`;
  if (!Number.isInteger(input.min_picks) || input.min_picks < 1) return "Minimum picks must be at least 1.";
  return null;
}
