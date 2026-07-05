import type { SubgraphStake } from "@/lib/subgraph-queries";

export function num(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

/** Realized P&L for a single closed stake, null if still open. */
export function stakePnl(bet: SubgraphStake): number | null {
  if (bet.status === "WON") return num(bet.payout) - num(bet.amount);
  if (bet.status === "SOLD") return num(bet.proceeds) - num(bet.amount);
  if (bet.status === "LOST") return -num(bet.amount);
  return null;
}

export function computeStakeStats(bets: SubgraphStake[]) {
  const totalStaked = bets.reduce((s, b) => s + num(b.amount), 0);
  const won = bets.filter((b) => b.status === "WON").length;
  const lost = bets.filter((b) => b.status === "LOST").length;
  const open = bets.filter((b) => b.status === "OPEN").length;
  const closed = bets.length - open;
  const realizedPnl = bets.reduce((s, b) => s + (stakePnl(b) ?? 0), 0);
  const winRate = closed ? won / closed : 0;
  return { totalStaked, won, lost, open, closed, realizedPnl, winRate };
}
