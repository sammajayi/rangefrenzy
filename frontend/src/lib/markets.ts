export type PredictionRange = {
  id: string;
  label: string;
  minPct: number;
  maxPct: number | null;
};

export type PredictionMarket = {
  id: string;
  title: string;
  asset: string;
  category: string;
  windowLabel: string;
  volumeLabel: string;
  ranges: PredictionRange[];
  image?: string;
  status?: "active" | "resolved";
};

// Fallback static markets used when Supabase has no data yet
export const FALLBACK_MARKETS: PredictionMarket[] = [
  {
    id: "btc-24h",
    title: "BTC move in 24h",
    asset: "BTC",
    category: "Crypto",
    windowLabel: "Resolves in 18h 42m",
    volumeLabel: "$128k staked",
    ranges: [
      { id: "r0", label: "0% – 2%", minPct: 0, maxPct: 2 },
      { id: "r1", label: "2% – 5%", minPct: 2, maxPct: 5 },
      { id: "r2", label: "5% – 10%", minPct: 5, maxPct: 10 },
      { id: "r3", label: "Above 10%", minPct: 10, maxPct: null },
    ],
  },
  {
    id: "eth-12h",
    title: "ETH move in 12h",
    asset: "ETH",
    category: "Crypto",
    windowLabel: "Resolves in 6h 08m",
    volumeLabel: "$54k staked",
    ranges: [
      { id: "r0", label: "0% – 1%", minPct: 0, maxPct: 1 },
      { id: "r1", label: "1% – 3%", minPct: 1, maxPct: 3 },
      { id: "r2", label: "3% – 6%", minPct: 3, maxPct: 6 },
      { id: "r3", label: "Above 6%", minPct: 6, maxPct: null },
    ],
  },
  {
    id: "celo-48h",
    title: "CELO move in 48h",
    asset: "CELO",
    category: "Crypto",
    windowLabel: "Resolves in 31h 15m",
    volumeLabel: "$22k staked",
    ranges: [
      { id: "r0", label: "0% – 3%", minPct: 0, maxPct: 3 },
      { id: "r1", label: "3% – 8%", minPct: 3, maxPct: 8 },
      { id: "r2", label: "8% – 15%", minPct: 8, maxPct: 15 },
      { id: "r3", label: "Above 15%", minPct: 15, maxPct: null },
    ],
  },
];

// Weekly campaign still uses placeholder data until a campaign table exists
export const MOCK_WEEKLY_CAMPAIGN = [
  { rank: 1, username: "week_storm", poolShare: "$2,100", picks: 24, badge: "Hot streak" as string | null },
  { rank: 2, username: "range_queen", poolShare: "$1,480", picks: 19, badge: null },
  { rank: 3, username: "celo_sniper", poolShare: "$920", picks: 16, badge: null },
  { rank: 4, username: "daily_grind", poolShare: "$410", picks: 11, badge: null },
  { rank: 5, username: "you", poolShare: "$0", picks: 0, badge: null },
];

export function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return "Resolved";
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  return `Resolves in ${diffH}h ${diffM}m`;
}
