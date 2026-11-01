"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  Activity02Icon, User02Icon, Chart01Icon,
  GiftIcon, Notification03Icon, Cancel01Icon, Share01Icon, CheckmarkCircle01Icon, ArrowDown01Icon, Clock01Icon,
} from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MarketCard } from "@/components/market-card";
import { PositionPanel, Notice } from "@/components/position-panel";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { ProfileView } from "@/components/profile-view";
import { Leaderboard } from "@/components/Leaderboard";
import { ShareBetModal } from "@/components/ShareBetModal";
import { MiniPriceChart } from "@/components/MiniPriceChart";
import { useFactoryMarkets, formatRangeLabel, type OnChainMarket, type OnChainRange } from "@/lib/hooks/use-factory-markets";
import { useMarketContract } from "@/lib/hooks/use-market-contract";
import { useStake } from "@/lib/hooks/use-stake";
import { useSell } from "@/lib/hooks/use-sell";
import { useClaim } from "@/lib/hooks/use-claim";
import { erc20Abi, rangeFrenzyMarketAbi, STAKE_TOKEN_ADDRESS, MarketStatus } from "@/lib/contracts";
import { useAppStore } from "@/lib/store";
import { useUserStakes } from "@/lib/hooks/use-user-stakes";
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
}


export function RangeFrenzyHome({ address, profile }: Props) {
  const pendingTab = useAppStore((s) => s.pendingTab);
  const setPendingTab = useAppStore((s) => s.setPendingTab);
  const claimBadgeActive = useAppStore((s) => s.claimBadgeActive);
  const [tab, setTab] = useState<Tab>(pendingTab ?? "play");

  useEffect(() => {
    if (pendingTab) setPendingTab(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const { data: userBets } = useUserStakes(address);
  const claimableCount = useMemo(
    () => (userBets ?? []).filter((b) => b.status === "WON" && !b.claimed).length,
    [userBets],
  );
  const searchParams = useSearchParams();
  const [copiedShare, setCopiedShare] = useState(false);

  // Deep link: ?market=<address> auto-opens that market's detail modal.
  useEffect(() => {
    const marketParam = searchParams.get("market");
    if (!marketParam || !markets.length) return;
    const match = markets.find((m) => m.address.toLowerCase() === marketParam.toLowerCase());
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing component state from the URL on mount
      setSelected({ market: match, range: match.ranges[0] });
      setShowStakeModal(true);
      setTab("play");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams, markets]);

  const handleShareMarket = (market: OnChainMarket) => {
    // Per-market share URL so the link preview shows this market's metadata.
    const url = `${window.location.origin}/m/${market.address.toLowerCase()}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: market.question, url }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const categories = [...new Set(markets.map((m) => m.categoryLabel))];

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const filteredMarkets = markets.filter((m) => {
    if (!m.isActive) return false;
    if (m.deadline <= nowSec) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      if (!m.question.toLowerCase().includes(q) && !m.categoryLabel.toLowerCase().includes(q)) return false;
    }
    if (selectedCategory && m.categoryLabel !== selectedCategory) return false;
    return true;
  });

  const handleSelectMarket = (market: OnChainMarket) => {
    setSelected({ market, range: market.ranges[0] });
    setShowStakeModal(true);
  };

  const handleClaimMarket = (marketAddress: string) => {
    const market = markets.find((m) => m.address.toLowerCase() === marketAddress.toLowerCase());
    if (!market) return;
    setSelected({ market, range: market.ranges[0] });
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
                      aria-pressed={active}
                      onClick={() => setSelectedCategory(isAll ? null : (selectedCategory === c ? null : c))}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-semibold transition border",
                        active
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
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
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
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
                  return (
                    <li key={market.address}>
                      <MarketCard market={market} onSelect={handleSelectMarket} />
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
                  aria-pressed={boardSub === sub}
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
              <Leaderboard address={address} />
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
          <ProfileView address={address} profile={profile} onClaimMarket={handleClaimMarket} />
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all",
                  active ? "text-brand" : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-2xl bg-brand/8" />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.id === "earn" && claimBadgeActive && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                  {item.id === "profile" && claimableCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold leading-none text-white">
                      {claimableCount}
                    </span>
                  )}
                </span>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── FILTER PANEL ── */}
      {showFilter && (
        <Modal title="Filter markets" onClose={() => setShowFilter(false)} z="z-[70]" sheet overlayClassName="bg-black/40">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Filter markets</h3>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground transition"
              >
                <Cancel01Icon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search markets…"
                aria-label="Search markets"
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
                    aria-pressed={selectedCategory === c}
                    onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      selectedCategory === c
                        ? "border-brand bg-brand/10 text-foreground"
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
        </Modal>
      )}

      {/* ── STAKE MODAL ── */}
      {selected && showStakeModal && (
        <StakeModal
          market={selected.market}
          selectedRange={selected.range}
          userAddress={address as `0x${string}`}
          onRangeSelect={(r) => setSelected({ ...selected, range: r })}
          onClose={handleCloseAll}
          copiedShare={copiedShare}
          onShareMarket={handleShareMarket}
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
  copiedShare,
  onShareMarket,
}: {
  market: OnChainMarket;
  selectedRange: OnChainRange;
  userAddress: `0x${string}`;
  onRangeSelect: (r: OnChainRange) => void;
  onClose: () => void;
  copiedShare: boolean;
  onShareMarket: (market: OnChainMarket) => void;
}) {
  const [amount, setAmount] = useState("");
  const [rangeChosen, setRangeChosen] = useState(false); // the user picks; we do not pre-select one
  const [showShare, setShowShare] = useState(false);

  const { address: wagmiAddress } = useAccount();
  const walletReady = !!wagmiAddress;

  const { summary, userStake, hasActivePosition, refetch } = useMarketContract(market.address, userAddress);
  const { stake, reset: resetStake, step: stakeStep, errorMsg: stakeError, symbol, decimals, stakeTxHash } = useStake(market.address);
  const { sell, reset: resetSell, step: sellStep, errorMsg: sellError } = useSell(market.address);
  const { execute: executeClaim, reset: resetClaim, step: claimStep, errorMsg: claimError } = useClaim(market.address);

  const { data: balanceRaw } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  // Bonding curve price for selected range (shown while staking)
  const { data: stakePriceRaw } = useReadContract({
    address: market.address,
    abi: rangeFrenzyMarketAbi,
    functionName: "getCurrentPrice",
    args: [BigInt(selectedRange.index)],
    query: { enabled: !!market.address },
  });

  // Current price for user's position range (sell proceeds preview)
  const { data: sellPriceRaw } = useReadContract({
    address: market.address,
    abi: rangeFrenzyMarketAbi,
    functionName: "getCurrentPrice",
    args: [userStake?.rangeIndex ?? 0n],
    query: { enabled: !!market.address && hasActivePosition && !!userStake },
  });

  const tokenDecimals = decimals ?? 18;
  const balance = balanceRaw ? parseFloat(formatUnits(balanceRaw as bigint, tokenDecimals)) : 0;
  const tokenSymbol = symbol ?? "G$";
  const minStake = summary ? parseFloat(formatUnits((summary as any).minStakeAmount ?? 1000000000000000000n, tokenDecimals)) : 1;

  const isOpen = market.status === MarketStatus.OPEN && market.deadline > BigInt(Math.floor(Date.now() / 1000));
  const isResolved = market.status === MarketStatus.RESOLVED;
  const isCancelled = market.status === MarketStatus.CANCELLED;

  // Sell is allowed when open or closed (contract blocks RESOLVED/CANCELLED)
  const canSell = hasActivePosition && !isResolved && !isCancelled;
  const canClaim = isResolved && hasActivePosition && userStake && !userStake.claimed && (userStake.estimatedPayout ?? 0n) > 0n;
  const canRefund = isCancelled && userStake && userStake.amountStaked > 0n && !userStake.claimed;

  const stakePrice = stakePriceRaw as bigint | undefined;
  const sellPrice = sellPriceRaw as bigint | undefined;

  // How many shares the entered amount would buy
  const estimatedShares = stakePrice && stakePrice > 0n && amount
    ? (parseFloat(amount) * 1e18) / Number(stakePrice)
    : 0;

  // Proceeds user would receive when selling at current price
  const expectedProceeds = userStake && sellPrice
    ? (userStake.shares * sellPrice) / BigInt(1e18)
    : 0n;

  // Range label for user's current position
  const positionRangeLabel =
    userStake?.rangeLabel ||
    (userStake && market.ranges[Number(userStake.rangeIndex)]
      ? formatRangeLabel(market.ranges[Number(userStake.rangeIndex)])
      : "");

  // Earn API calls after a successful stake
  useEffect(() => {
    if (stakeStep === "success" && userAddress) {
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
  }, [stakeStep, userAddress]);

  // Pop the share modal once the bet confirms.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the async stake step transition
    if (stakeStep === "success") setShowShare(true);
  }, [stakeStep]);

  // Write stake record to Supabase after on-chain confirm
  useEffect(() => {
    if (stakeStep !== "success" || !stakeTxHash || !amount || !userAddress) return;
    (async () => {
      let { data: marketRow } = await supabase
        .from("markets")
        .select("id")
        .eq("contract_address", market.address.toLowerCase())
        .maybeSingle();

      if (!marketRow) {
        // Market not in Supabase yet — auto-create a minimal record from on-chain data
        const MAX_U255 = BigInt(1) << BigInt(255);
        const { data: created } = await supabase
          .from("markets")
          .insert({
            title: market.question,
            category: market.categoryLabel,
            asset: "",
            window_label: market.deadlineLabel,
            volume_label: market.poolLabel,
            deadline: new Date(Number(market.deadline) * 1000).toISOString(),
            ranges: market.ranges.map((r, idx) => ({
              id: `r${idx}`,
              label: r.label || formatRangeLabel(r),
              min: parseFloat(formatUnits(r.lowerBound, 18)),
              max: r.upperBound >= MAX_U255 ? null : parseFloat(formatUnits(r.upperBound, 18)),
            })),
            status: market.isResolved ? "resolved" : "active",
            contract_address: market.address.toLowerCase(),
          })
          .select("id")
          .maybeSingle();
        marketRow = created;
      }

      if (!marketRow) return;
      await supabase.from("stakes").insert({
        wallet_address: userAddress.toLowerCase(),
        market_id: marketRow.id,
        range_index: selectedRange.index,
        range_label: selectedRange.label || formatRangeLabel(selectedRange),
        amount_gd: amount,
        tx_hash: stakeTxHash,
        status: "open",
      });
    })();
  }, [stakeStep, stakeTxHash, amount, userAddress, market.address, selectedRange]);

  // Refetch on-chain state after any tx succeeds
  useEffect(() => {
    if (stakeStep === "success" || sellStep === "success" || claimStep === "success") {
      refetch();
    }
  }, [stakeStep, sellStep, claimStep, refetch]);

  const handleStake = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const amountWei = parseUnits(amount, tokenDecimals);
    await stake(selectedRange.index, amountWei);
  };

  const handleClose = () => {
    resetStake();
    resetSell();
    resetClaim();
    setAmount("");
    onClose();
  };

  const statusLabel =
    market.status === MarketStatus.OPEN ? "Open" :
    market.status === MarketStatus.CLOSED ? "Closed" :
    market.status === MarketStatus.RESOLVED ? "Resolved" : "Cancelled";


  const anySuccess = stakeStep === "success" || sellStep === "success" || claimStep === "success";

  // Share of the pool per range, so picking a range is an informed choice.
  const totalStaked = market.ranges.reduce((sum, r) => sum + r.totalStaked, 0n);
  const shareOf = (r: OnChainRange) =>
    totalStaked > 0n ? Math.round(Number((r.totalStaked * 1000n) / totalStaked) / 10) : 0;

  // Gain or loss if the position were sold at the current price.
  const stakedNum = userStake ? parseFloat(formatUnits(userStake.amountStaked, tokenDecimals)) : 0;
  const exitNum = parseFloat(formatUnits(expectedProceeds, tokenDecimals));
  const exitDelta = exitNum - stakedNum;

  const amountNum = parseFloat(amount);
  const amountValid = rangeChosen && amountNum > 0 && amountNum >= minStake && amountNum <= balance;
  const showStakeForm = !hasActivePosition && isOpen && stakeStep !== "success";
  const hint =
    amountNum > 0 && amountNum < minStake
      ? `Minimum stake is ${minStake} ${tokenSymbol}.`
      : amountNum > balance
        ? `You have ${balance.toFixed(2)} ${tokenSymbol} available.`
        : null;

  return (
    <Modal title={market.question} onClose={handleClose} sheet>
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <p className="text-xs">
              <span className="font-semibold uppercase tracking-wide text-brand">{market.categoryLabel}</span>
              <span className="text-muted-foreground"> · {statusLabel}</span>
            </p>
            <h3 className="mt-1 text-balance font-display text-lg font-bold leading-snug">{market.question}</h3>
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums text-muted-foreground">
              <span className="whitespace-nowrap">
                {market.pool > 0n ? market.poolLabel + " pool" : "Empty pool"}
                {market.numStakers > 0 && ` · ${market.numStakers} ${market.numStakers === 1 ? "staker" : "stakers"}`}
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock01Icon aria-hidden className="h-4 w-4" />
                {market.deadlineLabel}
              </span>
            </p>
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0">
            <button
              type="button"
              onClick={() => onShareMarket(market)}
              aria-label="Share market"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {copiedShare ? <CheckmarkCircle01Icon className="h-5 w-5 text-brand" /> : <Share01Icon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Cancel01Icon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          <PositionPanel
            symbol={tokenSymbol}
            showCard={!!(hasActivePosition && userStake && userStake.amountStaked > 0n)}
            rangeLabel={positionRangeLabel}
            staked={stakedNum}
            shares={userStake ? Number(userStake.shares) / 1e18 : 0}
            exitValue={canSell && expectedProceeds > 0n ? exitNum : null}
            payout={
              isResolved && userStake && (userStake.estimatedPayout ?? 0n) > 0n
                ? parseFloat(formatUnits(userStake.estimatedPayout, tokenDecimals))
                : null
            }
            claimed={!!userStake?.claimed}
            resolved={isResolved}
            canSell={!!canSell}
            canClaim={!!canClaim}
            canRefund={!!canRefund}
            walletReady={walletReady}
            sell={{ step: sellStep, error: sellError, onSell: sell, onRetry: resetSell }}
            claim={{
              step: claimStep,
              error: claimError,
              onClaim: () => executeClaim("claim"),
              onRefund: () => executeClaim("refund"),
              onRetry: resetClaim,
            }}
          />

          {/* Stake form */}
          {showStakeForm && (
            <>
              <section aria-label="Pick a range">
                <h4 className="mb-2 text-sm font-semibold">Pick a range</h4>
                <div className="grid grid-cols-2 gap-2">
                  {market.ranges.map((r) => (
                    <button
                      key={r.index}
                      type="button"
                      aria-pressed={rangeChosen && selectedRange.index === r.index}
                      onClick={() => {
                        setRangeChosen(true);
                        onRangeSelect(r);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition",
                        rangeChosen && selectedRange.index === r.index
                          ? "border-brand bg-brand/10"
                          : "border-border hover:border-brand/40"
                      )}
                    >
                      <span className="block text-sm font-semibold tabular-nums">{formatRangeLabel(r)}</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {totalStaked > 0n ? `${shareOf(r)}% of pool` : "No stakes"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section aria-label="Amount">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="stake-amount" className="text-sm font-semibold">
                    Amount
                  </label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Balance {balance.toFixed(2)} {tokenSymbol}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="stake-amount"
                    type="number"
                    inputMode="decimal"
                    min={minStake}
                    step="0.01"
                    placeholder={`Min ${minStake}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background pl-4 pr-28 text-base tabular-nums outline-none ring-2 ring-transparent focus:ring-brand/30"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    <span className="text-sm text-muted-foreground">{tokenSymbol}</span>
                    <button
                      type="button"
                      onClick={() => setAmount(balance.toString())}
                      className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/70"
                    >
                      Max
                    </button>
                  </div>
                </div>
                {stakeError ? (
                  <p role="alert" className="mt-2 text-sm text-destructive">{stakeError}</p>
                ) : hint ? (
                  <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
                ) : rangeChosen && stakePrice && stakePrice > 0n && estimatedShares > 0 ? (
                  <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                    You get about {estimatedShares.toFixed(2)} shares at {(Number(stakePrice) / 1e18).toFixed(2)} {tokenSymbol} each.
                  </p>
                ) : null}
              </section>
            </>
          )}

          {stakeStep === "success" && <Notice title="Stake placed" body="Your prediction is locked in." />}

          {!hasActivePosition && !isOpen && !canRefund && (
            <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
              {isResolved ? "This market has been resolved." : isCancelled ? "This market has been cancelled." : "Staking is closed for this market."}
            </p>
          )}

          {/* Price chart: secondary, collapsed so an empty chart does not push the action down. */}
          <details className="group rounded-xl border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              Price movement
              <ArrowDown01Icon className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4">
              <MiniPriceChart
                marketAddress={market.address}
                ranges={market.ranges.map((r) => ({ index: r.index, label: formatRangeLabel(r) }))}
              />
            </div>
          </details>
        </div>

        {/* Footer: the primary action is always on screen */}
        <div className="border-t border-border bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {showStakeForm ? (
            <>
              <Button
                type="button"
                className="h-12 w-full text-base font-semibold"
                disabled={!walletReady || !amountValid || stakeStep === "approving" || stakeStep === "staking"}
                onClick={handleStake}
              >
                {stakeStep === "approving"
                  ? "Approving…"
                  : stakeStep === "staking"
                    ? "Staking…"
                    : !rangeChosen
                      ? "Pick a range"
                      : amountValid
                        ? `Stake ${amount} ${tokenSymbol} on ${formatRangeLabel(selectedRange)}`
                        : "Enter an amount"}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                You can lose the G$ you stake. Selling early pays the current price, which can be lower than what you paid.
              </p>
            </>
          ) : (
            <Button type="button" variant="outline" className="h-12 w-full" onClick={handleClose}>
              {anySuccess ? "Done" : "Close"}
            </Button>
          )}
        </div>
      </div>

      {showShare && stakeStep === "success" && (
        <ShareBetModal
          marketAddress={market.address.toLowerCase()}
          rangeIndex={selectedRange.index}
          rangeLabel={selectedRange.label || formatRangeLabel(selectedRange)}
          question={market.question}
          onClose={() => setShowShare(false)}
        />
      )}
    </Modal>
  );
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
      <p className="font-display text-xl font-bold">Weekly campaign</p>
      <p className="text-sm text-muted-foreground mt-2">No stakes this week yet. Be the first.</p>
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
          <thead className="bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">User</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Staked</th>
              <th className="px-3 py-2 text-right">Picks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.wallet} className="border-t border-border bg-card">
                <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 font-medium">@{row.username}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{row.totalStaked.toFixed(2)} G$</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{row.picks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
