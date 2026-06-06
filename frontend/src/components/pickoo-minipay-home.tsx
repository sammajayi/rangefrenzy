"use client";

import { useState, useEffect } from "react";
import { parseUnits, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  Activity02Icon, User02Icon, Chart01Icon,
  FilterHorizontalIcon, Search01Icon, Cancel01Icon,
  MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon,
} from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ProfileView } from "@/components/profile-view";
import { useFactoryMarkets, type OnChainMarket, type OnChainRange } from "@/lib/hooks/use-factory-markets";
import { useMarketContract } from "@/lib/hooks/use-market-contract";
import { useStake } from "@/lib/hooks/use-stake";
import { erc20Abi, STAKE_TOKEN_ADDRESS, MarketStatus } from "@/lib/contracts";

type Tab = "play" | "board" | "profile";
type BoardSub = "leaderboard" | "weekly";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

export function RangeFrenzyHome({ address, profile, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>("play");
  const [boardSub, setBoardSub] = useState<BoardSub>("leaderboard");
  const [selected, setSelected] = useState<{ market: OnChainMarket; range: OnChainRange } | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { markets, isLoading } = useFactoryMarkets();

  const categories = [...new Set(markets.map((m) => m.categoryLabel))];

  const filtered = markets.filter((m) => {
    if (!m.isActive) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      if (!m.question.toLowerCase().includes(q) && !m.categoryLabel.toLowerCase().includes(q)) return false;
    }
    if (selectedCategory && m.categoryLabel !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] pb-24">
      <div className={cn("container mx-auto max-w-lg px-4 lg:max-w-4xl", tab === "profile" ? "pt-2" : "pt-6")}>

        {/* ── PLAY TAB ── */}
        {tab === "play" && (
          <div className="space-y-5">
            {showSearch ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30"
                  autoFocus
                />
                <button type="button" onClick={() => { setShowSearch(false); setFilterSearch(""); }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition">
                  <Cancel01Icon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setShowFilter(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition">
                  <FilterHorizontalIcon className="h-5 w-5" />
                </button>
                <div className="text-center flex-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Live ranges</h2>
                  <p className="text-sm text-muted-foreground">Tap a market to stake your prediction.</p>
                </div>
                <button type="button" onClick={() => setShowSearch(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition">
                  <Search01Icon className="h-5 w-5" />
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">No markets yet</p>
                <p className="text-sm mt-1">Check back soon.</p>
              </div>
            ) : (
              <ul className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {filtered.map((market) => (
                  <li key={market.address}>
                    <button
                      type="button"
                      onClick={() => setSelected({ market, range: market.ranges[0] })}
                      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {market.categoryLabel}
                          </p>
                          <p className="font-display text-lg font-semibold leading-snug mt-0.5">{market.question}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{market.deadlineLabel}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                            <Chart01Icon className="h-3 w-3" />
                            {market.poolLabel}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{market.numStakers} stakers</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {market.ranges.map((r) => (
                          <span key={r.index} className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── BOARD TAB ── */}
        {tab === "board" && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-1 rounded-2xl border border-border bg-muted/40 p-1">
              {(["leaderboard", "weekly"] as const).map((sub) => (
                <button key={sub} type="button" onClick={() => setBoardSub(sub)}
                  className={cn("flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition",
                    boardSub === sub ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                  {sub === "leaderboard" ? "Leaderboard" : "Weekly campaign"}
                </button>
              ))}
            </div>

            {boardSub === "leaderboard" ? (
              <LeaderboardSection currentAddress={address} />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">Coming soon</p>
                <p className="text-sm mt-1">Weekly campaigns will appear once markets resolve.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <ProfileView address={address} profile={profile} onSignOut={onSignOut} />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:max-w-4xl">
          {([
            { id: "play" as const, label: "Play", Icon: Activity02Icon },
            { id: "board" as const, label: "Board", Icon: Chart01Icon },
            { id: "profile" as const, label: "You", Icon: User02Icon },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition",
                tab === id ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── FILTER PANEL ── */}
      {showFilter && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Filter Markets</h3>
              <button type="button" onClick={() => setShowFilter(false)} className="text-muted-foreground hover:text-foreground transition">
                <Cancel01Icon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <input type="text" placeholder="Search markets..." value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30" />
            </div>
            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                    className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      selectedCategory === c ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setFilterSearch(""); setSelectedCategory(null); setShowFilter(false); }}>
                Clear
              </Button>
              <Button type="button" className="flex-1" onClick={() => setShowFilter(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKET DETAIL + STAKE MODAL ── */}
      {selected && (
        <StakeModal
          market={selected.market}
          selectedRange={selected.range}
          userAddress={address as `0x${string}`}
          onRangeSelect={(r) => setSelected({ ...selected, range: r })}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ── Stake Modal ── */
function StakeModal({
  market,
  selectedRange,
  userAddress,
  onRangeSelect,
  onClose,
}: {
  market: OnChainMarket;
  selectedRange: OnChainRange;
  userAddress: `0x${string}`;
  onRangeSelect: (r: OnChainRange) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");

  const { summary, userStake, hasStaked } = useMarketContract(market.address, userAddress);
  const { stake, reset, step, errorMsg, symbol, decimals } = useStake(market.address);

  const { data: balanceRaw } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const tokenDecimals = decimals ?? 18;
  const balance = balanceRaw ? parseFloat(formatUnits(balanceRaw as bigint, tokenDecimals)) : 0;
  const tokenSymbol = symbol ?? "G$";

  const minStake = summary ? parseFloat(formatUnits((summary as any).minStakeAmount ?? 1000000000000000000n, tokenDecimals)) : 1;

  const isOpen = market.status === MarketStatus.OPEN;
  const isResolved = market.status === MarketStatus.RESOLVED;

  const handleStake = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const amountWei = parseUnits(amount, tokenDecimals);
    await stake(selectedRange.index, amountWei);
  };

  const handleClose = () => {
    reset();
    setAmount("");
    onClose();
  };

  const statusLabel =
    market.status === MarketStatus.OPEN ? "Open" :
    market.status === MarketStatus.CLOSED ? "Closed" :
    market.status === MarketStatus.RESOLVED ? "Resolved" : "Cancelled";

  const statusColor =
    market.status === MarketStatus.OPEN ? "bg-green-100 text-green-700" :
    market.status === MarketStatus.RESOLVED ? "bg-blue-100 text-blue-700" :
    "bg-muted text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{market.categoryLabel}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusColor)}>{statusLabel}</span>
            </div>
            <h3 className="font-display text-lg font-bold leading-snug">{market.question}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{market.deadlineLabel}</p>
          </div>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground transition shrink-0">
            <Cancel01Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Pool stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total pool</p>
            <p className="font-bold tabular-nums">{market.poolLabel}</p>
          </div>
          <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Stakers</p>
            <p className="font-bold tabular-nums">{market.numStakers}</p>
          </div>
        </div>

        {/* User's existing stake */}
        {hasStaked && userStake && userStake.amount > 0n && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary mb-1">Your stake</p>
            <p className="text-sm">
              <span className="font-bold">{formatUnits(userStake.amount, tokenDecimals)} {tokenSymbol}</span>
              {" "}on <span className="font-bold">{userStake.rangeLabel}</span>
            </p>
            {isResolved && userStake.estimatedPayout > 0n && (
              <p className="text-xs text-muted-foreground mt-1">
                Payout: {parseFloat(formatUnits(userStake.estimatedPayout, tokenDecimals)).toFixed(4)} {tokenSymbol}
              </p>
            )}
          </div>
        )}

        {/* Range selection */}
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pick your range</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {market.ranges.map((r) => {
            const rangePool = parseFloat(formatUnits(r.totalStaked, tokenDecimals));
            return (
              <button
                key={r.index}
                type="button"
                onClick={() => !hasStaked && isOpen && onRangeSelect(r)}
                disabled={hasStaked || !isOpen}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                  selectedRange.index === r.index
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground",
                  (hasStaked || !isOpen) && "opacity-60 cursor-default hover:border-border",
                  !hasStaked && isOpen && "hover:border-primary/40 cursor-pointer"
                )}
              >
                <p className="font-semibold">{r.label}</p>
                {rangePool > 0 && <p className="text-[10px] mt-0.5 opacity-70">{rangePool.toFixed(2)} {tokenSymbol}</p>}
              </button>
            );
          })}
        </div>

        {/* Stake input — only when open and not yet staked */}
        {isOpen && !hasStaked && step !== "success" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount ({tokenSymbol})</p>
              <button type="button" onClick={() => setAmount(balance.toString())}
                className="text-xs text-primary hover:underline">
                Max: {balance.toFixed(4)}
              </button>
            </div>
            <input
              type="number"
              min={minStake}
              step="0.01"
              placeholder={`Min ${minStake} ${tokenSymbol}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            {errorMsg && <p className="mt-1.5 text-xs text-destructive">{errorMsg}</p>}
          </div>
        )}

        {/* Success state */}
        {step === "success" && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="font-semibold text-green-700">Stake confirmed!</p>
            <p className="text-xs text-green-600 mt-1">Your prediction is locked in.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            {step === "success" ? "Done" : "Close"}
          </Button>
          {isOpen && !hasStaked && step !== "success" && (
            <Button
              type="button"
              className="flex-1"
              disabled={!amount || parseFloat(amount) < minStake || step === "approving" || step === "staking"}
              onClick={handleStake}
            >
              {step === "approving" ? "Approving…" :
               step === "staking" ? "Staking…" :
               `Stake on ${selectedRange.label}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Leaderboard ── */
type LeaderEntry = { wallet_address: string; username: string; avatar_url: string | null };

const PODIUM_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-gray-100 border-gray-400 text-gray-700",
  "bg-orange-100 border-orange-400 text-orange-800",
];
const PODIUM_ICONS = [MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon];

function LeaderboardSection({ currentAddress }: { currentAddress: string }) {
  const [profiles, setProfiles] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("wallet_address, username, avatar_url")
      .order("created_at", { ascending: true })
      .limit(10)
      .then(({ data }) => {
        setProfiles((data as LeaderEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">No players yet</p>
        <p className="text-sm mt-1">Be the first to stake and appear here.</p>
      </div>
    );
  }

  const top3 = profiles.slice(0, 3);
  const rest = profiles.slice(3);

  return (
    <div>
      <div className="mb-3">
        <h2 className="font-display text-xl font-bold">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">Players on RangeFrenzy</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {top3.map((entry, i) => {
          const Icon = PODIUM_ICONS[i];
          const isYou = entry.wallet_address.toLowerCase() === currentAddress.toLowerCase();
          return (
            <div key={entry.wallet_address} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center", PODIUM_COLORS[i])}>
              <Icon className="h-6 w-6" />
              <ProfileAvatar entry={entry} size="md" />
              <div>
                <p className="text-xs font-bold leading-tight">@{entry.username}{isYou ? " (you)" : ""}</p>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">User</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row, i) => {
                const isYou = row.wallet_address.toLowerCase() === currentAddress.toLowerCase();
                return (
                  <tr key={row.wallet_address} className="border-t border-border bg-card">
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{i + 4}</td>
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar entry={row} size="sm" />
                        <span>@{row.username}{isYou ? " (you)" : ""}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ entry, size }: { entry: LeaderEntry; size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  if (entry.avatar_url) {
    return <img src={entry.avatar_url} alt={entry.username} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}>
      {entry.username.charAt(0).toUpperCase()}
    </div>
  );
}
