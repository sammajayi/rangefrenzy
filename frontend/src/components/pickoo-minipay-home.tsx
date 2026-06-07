"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { parseUnits, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  Activity02Icon, User02Icon, Chart01Icon, ArrowRight01Icon,
  MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon,
  GiftIcon, Notification03Icon, Cancel01Icon,
} from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { ProfileView } from "@/components/profile-view";
import { useFactoryMarkets, formatRangeLabel, type OnChainMarket, type OnChainRange } from "@/lib/hooks/use-factory-markets";
import { useMarketContract } from "@/lib/hooks/use-market-contract";
import { useStake } from "@/lib/hooks/use-stake";
import { erc20Abi, STAKE_TOKEN_ADDRESS, MarketStatus } from "@/lib/contracts";
import { useAppStore } from "@/lib/store";
import { EarnTab } from "@/components/EarnTab";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { useNotifications } from "@/hooks/useNotifications";

const ClaimPage = lazy(() =>
  import("@/components/gooddollar/ClaimPage").then((m) => ({ default: m.ClaimPage }))
);

type Tab = "play" | "board" | "earn" | "profile";
type BoardSub = "leaderboard" | "weekly";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

const CATEGORY_CHIP: Record<string, string> = {
  crypto: "bg-blue-50 text-blue-700 border-blue-200",
  sports: "bg-amber-50 text-amber-700 border-amber-200",
  local: "bg-purple-50 text-purple-700 border-purple-200",
};
const CATEGORY_GRADIENT: Record<string, string> = {
  crypto: "from-blue-50 to-blue-100",
  sports: "from-amber-50 to-amber-100",
  local: "from-purple-50 to-purple-100",
};

export function RangeFrenzyHome({ address, profile, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>("play");
  const [boardSub, setBoardSub] = useState<BoardSub>("leaderboard");
  const [selected, setSelected] = useState<{
    market: OnChainMarket;
    range: OnChainRange;
  } | null>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { markets, isLoading } = useFactoryMarkets();

  const categories = [...new Set(markets.map((m) => m.categoryLabel))];

  const filteredMarkets = markets.filter((m) => {
    if (!m.isActive) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      if (!m.question.toLowerCase().includes(q) && !m.categoryLabel.toLowerCase().includes(q)) return false;
    }
    if (selectedCategory && m.categoryLabel !== selectedCategory) return false;
    return true;
  });

  const handleSelectMarket = (market: OnChainMarket) => {
    setSelected({ market, range: market.ranges[0] });
    setShowStakeModal(false);
  };

  const handleStakeClick = () => {
    setShowStakeModal(true);
  };

  const handleCloseAll = () => {
    setSelected(null);
    setShowStakeModal(false);
  };

  return (
    <div className="relative min-h-dvh pb-24">
      {/* ── STICKY HEADER ── */}
      {tab !== "profile" && (
        <Navbar
          tab={tab}
          showSearch={showSearch}
          filterSearch={filterSearch}
          onToggleSearch={() => setShowSearch((p) => !p)}
          onSearchChange={setFilterSearch}
          onToggleFilter={() => setShowFilter(true)}
          username={profile?.username ?? address}
        />
      )}

      <div className={cn("container mx-auto max-w-lg px-4 lg:max-w-4xl", tab === "profile" ? "pt-2" : "pt-4")}>

        {/* ── PLAY TAB ── */}
        {tab === "play" && (
          <div className="space-y-4">
            {/* Category filter pills */}
            <div className="-mx-4 overflow-x-auto px-4">
              <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                {(["All", ...categories] as const).map((c) => {
                  const isAll = c === "All";
                  const active = isAll ? !selectedCategory : selectedCategory === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCategory(isAll ? null : (selectedCategory === c ? null : c))}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-semibold transition border",
                        active
                          ? "bg-[#07955F] text-white border-[#07955F] shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-[#07955F]/40 hover:text-foreground",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#07955F]" />
              </div>
            ) : filteredMarkets.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Chart01Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold">No markets found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different category or clear your search.</p>
              </div>
            ) : (
              <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {filteredMarkets.map((market) => {
                  const catKey = market.categoryLabel.toLowerCase();
                  const chipClass = CATEGORY_CHIP[catKey] ?? "bg-muted text-muted-foreground border-border";
                  const gradientClass = CATEGORY_GRADIENT[catKey] ?? "from-muted to-muted/60";
                  return (
                    <li key={market.address}>
                      <button
                        type="button"
                        onClick={() => handleSelectMarket(market)}
                        className="group w-full rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-[#07955F]/30 hover:shadow-md"
                      >
                        <div className={cn("mb-3 flex h-36 items-center justify-center overflow-hidden rounded-2xl lg:h-44", market.imageUrl ? "" : `bg-gradient-to-br ${gradientClass}`)}>
                          {market.imageUrl ? (
                            <img src={market.imageUrl} alt={market.question} className="h-full w-full object-cover" />
                          ) : (
                            <Chart01Icon className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", chipClass)}>
                                {market.categoryLabel}
                              </span>
                              <span className="text-[11px] text-muted-foreground">·</span>
                              <span className="text-[11px] font-medium text-muted-foreground">G$</span>
                            </div>
                            <p className="font-display text-base font-semibold leading-snug">{market.question}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{market.deadlineLabel}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#07955F]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#07955F] tabular-nums">
                              <Chart01Icon className="h-3 w-3" />
                              {market.poolLabel === "No stakes yet" ? "0" : market.poolLabel.split(" ")[0]}
                            </span>
                            <ArrowRight01Icon className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[#07955F]" />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {market.ranges.map((r) => (
                            <span key={r.index} className="rounded-lg border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {formatRangeLabel(r)}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── BOARD TAB ── */}
        {tab === "board" && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-1 rounded-2xl border border-border bg-muted/40 p-1">
              {(["leaderboard", "weekly"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setBoardSub(sub)}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition",
                    boardSub === sub
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {sub === "leaderboard" ? "Leaderboard" : "Weekly campaign"}
                </button>
              ))}
            </div>

            {boardSub === "leaderboard" ? (
              <LeaderboardSection currentAddress={address} />
            ) : (
              <WeeklyCampaignSection />
            )}
          </div>
        )}

        {/* ── EARN TAB ── */}
        {tab === "earn" && (
          <div className="pt-4">
            <EarnTab address={address} />
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <ProfileView address={address} profile={profile} onSignOut={onSignOut} />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/97 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:max-w-4xl">
          {(
            [
              { id: "play" as Tab, icon: Activity02Icon, label: "Play" },
              { id: "board" as Tab, icon: Chart01Icon, label: "Board" },
              { id: "earn" as Tab, icon: GiftIcon, label: "Earn" },
              { id: "profile" as Tab, icon: User02Icon, label: "You" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all",
                  active ? "text-[#07955F]" : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-2xl bg-[#07955F]/8" />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── FILTER PANEL ── */}
      {showFilter && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Filter Markets</h3>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <Cancel01Icon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search markets..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30"
              />
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      selectedCategory === c
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFilterSearch("");
                  setSelectedCategory(null);
                  setShowFilter(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => setShowFilter(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKET DETAIL MODAL ── */}
      {selected && !showStakeModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className={cn("flex h-36 items-center justify-center overflow-hidden", selected.market.imageUrl ? "" : `bg-gradient-to-br ${CATEGORY_GRADIENT[selected.market.categoryLabel.toLowerCase()] ?? "from-muted to-muted/60"}`)}>
              {selected.market.imageUrl ? (
                <img src={selected.market.imageUrl} alt={selected.market.question} className="h-full w-full object-cover" />
              ) : (
                <Chart01Icon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="p-6">
              <div className="mb-1 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", CATEGORY_CHIP[selected.market.categoryLabel.toLowerCase()] ?? "bg-muted text-muted-foreground border-border")}>
                  {selected.market.categoryLabel}
                </span>
                <span className="text-xs text-muted-foreground">G$</span>
              </div>
              <h3 className="font-display text-xl font-bold">{selected.market.question}</h3>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{selected.market.deadlineLabel}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#07955F]/10 px-2.5 py-0.5 text-xs font-bold text-[#07955F] tabular-nums">
                  <Chart01Icon className="h-3.5 w-3.5" />
                  {selected.market.poolLabel === "No stakes yet" ? "0" : selected.market.poolLabel.split(" ")[0]}
                </span>
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pick your range</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selected.market.ranges.map((r) => (
                  <button
                    key={r.index}
                    type="button"
                    onClick={() => setSelected({ ...selected, range: r })}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                      selected.range.index === r.index
                        ? "border-[#07955F] bg-[#07955F]/8 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-[#07955F]/40",
                    )}
                  >
                    {formatRangeLabel(r)}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 rounded-2xl" onClick={handleCloseAll}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="flex-1 rounded-2xl bg-[#07955F] hover:bg-[#068050] text-white"
                  onClick={handleStakeClick}
                >
                  Stake G$
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAKE MODAL ── */}
      {selected && showStakeModal && (
        <StakeModal
          market={selected.market}
          selectedRange={selected.range}
          userAddress={address as `0x${string}`}
          onRangeSelect={(r) => setSelected({ ...selected, range: r })}
          onClose={handleCloseAll}
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

  useEffect(() => {
    if (step === "success" && userAddress) {
      fetch("/api/earn/first-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: userAddress }),
      }).catch(() => {});
      fetch("/api/earn/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: userAddress }),
      }).catch(() => {});
    }
  }, [step, userAddress]);

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
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition shrink-0"
          >
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
                <p className="font-semibold">{formatRangeLabel(r)}</p>
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
              <button
                type="button"
                onClick={() => setAmount(balance.toString())}
                className="text-xs text-primary hover:underline"
              >
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
               `Stake on ${formatRangeLabel(selectedRange)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Leaderboard ── */
type LeaderRow = {
  wallet_address: string;
  username: string;
  avatar_url: string | null;
  total_staked: number;
  wins: number;
  total_bets: number;
};

const PODIUM_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-gray-100 border-gray-400 text-gray-700",
  "bg-orange-100 border-orange-400 text-orange-800",
];
const PODIUM_ICONS = [MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon];

function LeaderboardSection({ currentAddress }: { currentAddress: string }) {
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("stakes")
      .select("wallet_address, amount_gd, status, profile:profiles!stakes_wallet_address_fkey(username, avatar_url)")
      .then(({ data }) => {
        if (!data?.length) { setLoading(false); return; }

        const map: Record<string, LeaderRow> = {};
        for (const row of data as any[]) {
          const addr = row.wallet_address as string;
          if (!map[addr]) {
            map[addr] = {
              wallet_address: addr,
              username: row.profile?.username ?? addr.slice(0, 6),
              avatar_url: row.profile?.avatar_url ?? null,
              total_staked: 0,
              wins: 0,
              total_bets: 0,
            };
          }
          map[addr].total_staked += parseFloat(row.amount_gd ?? "0");
          map[addr].total_bets += 1;
          if (row.status === "won") map[addr].wins += 1;
        }

        const sorted = Object.values(map).sort((a, b) => b.wins - a.wins || b.total_staked - a.total_staked);
        setLeaders(sorted.slice(0, 20));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (!leaders.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl font-bold">Leaderboard</p>
        <p className="text-sm text-muted-foreground mt-2">No bets yet — be the first to stake!</p>
      </div>
    );
  }

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">Top performers by wins</p>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {top3.map((entry, i) => {
          const Icon = PODIUM_ICONS[i];
          const winRate = entry.total_bets ? entry.wins / entry.total_bets : 0;
          return (
            <div key={entry.wallet_address} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center", PODIUM_COLORS[i])}>
              <Icon className="h-6 w-6" />
              <LeaderAvatar entry={entry} size="md" />
              <div>
                <p className="text-xs font-bold leading-tight">@{entry.username}</p>
                <p className="text-sm font-bold tabular-nums">{entry.wins}W</p>
                <p className="text-[10px] opacity-70">{winRate === 0 ? "—" : `${Math.round(winRate * 100)}%`} win</p>
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
                <th className="px-3 py-2 text-right">Wins</th>
                <th className="px-3 py-2 text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row, i) => {
                const winRate = row.total_bets ? row.wins / row.total_bets : 0;
                return (
                  <tr key={row.wallet_address} className="border-t border-border bg-card">
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{i + 4}</td>
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <LeaderAvatar entry={row} size="sm" />
                        @{row.username}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.wins}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {winRate === 0 ? "—" : `${Math.round(winRate * 100)}%`}
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

function LeaderAvatar({ entry, size }: { entry: LeaderRow; size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  const initial = entry.username.charAt(0).toUpperCase();
  if (entry.avatar_url) {
    return <img src={entry.avatar_url} alt={entry.username} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  return <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}>{initial}</div>;
}

/* ── Weekly Campaign ── */
type CampaignRow = { username: string; wallet: string; totalStaked: number; picks: number };

function WeeklyCampaignSection() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("stakes")
      .select("wallet_address, amount_gd, profile:profiles!stakes_wallet_address_fkey(username)")
      .gte("created_at", weekAgo)
      .then(({ data }) => {
        if (!data?.length) { setLoading(false); return; }
        const map: Record<string, CampaignRow> = {};
        for (const row of data as any[]) {
          const addr = row.wallet_address as string;
          if (!map[addr]) map[addr] = { username: row.profile?.username ?? addr.slice(0, 6), wallet: addr, totalStaked: 0, picks: 0 };
          map[addr].totalStaked += parseFloat(row.amount_gd ?? "0");
          map[addr].picks += 1;
        }
        setRows(Object.values(map).sort((a, b) => b.totalStaked - a.totalStaked).slice(0, 10));
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  if (!rows.length) return (
    <div className="py-16 text-center">
      <p className="font-display text-xl font-bold">Weekly Campaign</p>
      <p className="text-sm text-muted-foreground mt-2">No stakes this week yet — be first!</p>
    </div>
  );

  return (
    <>
      <div>
        <h2 className="font-display text-xl font-bold">Weekly campaign</h2>
        <p className="text-sm text-muted-foreground">Top stakers this week by G$ volume</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2 text-right">Staked</th>
              <th className="px-3 py-2 text-right">Picks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.wallet} className="border-t border-border bg-card">
                <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 font-medium">@{row.username}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.totalStaked.toFixed(2)} G$</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{row.picks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
