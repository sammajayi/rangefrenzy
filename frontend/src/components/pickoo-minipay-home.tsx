import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Activity02Icon, User02Icon, Camera01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Chart01Icon } from "hugeicons-react";
import { FilterHorizontalIcon, Search01Icon, Cancel01Icon } from "hugeicons-react";
import { MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Market } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { FALLBACK_MARKETS, formatDeadline } from "@/lib/markets";
import type { PredictionMarket, PredictionRange } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { ProfileView } from "@/components/profile-view";
import { useAppStore } from "@/lib/store";
import { SocialOnboardingModal } from "@/components/gooddollar/SocialOnboardingModal";
import { StakeModal } from "@/components/StakeModal";
import { Logo } from "@/components/logo";

const CATEGORY_CHIP: Record<string, string> = {
  sports: "bg-blue-50 text-blue-700 border-blue-200",
  crypto: "bg-amber-50 text-amber-700 border-amber-200",
  politics: "bg-purple-50 text-purple-700 border-purple-200",
  entertainment: "bg-pink-50 text-pink-700 border-pink-200",
  tech: "bg-cyan-50 text-cyan-700 border-cyan-200",
};
const CATEGORY_GRADIENT: Record<string, string> = {
  sports: "from-blue-50 to-blue-100",
  crypto: "from-amber-50 to-amber-100",
  politics: "from-purple-50 to-purple-100",
  entertainment: "from-pink-50 to-pink-100",
  tech: "from-cyan-50 to-cyan-100",
};

const ClaimPage = lazy(() =>
  import("@/components/gooddollar/ClaimPage").then((m) => ({ default: m.ClaimPage }))
);

type Tab = "play" | "board" | "claim" | "profile";
type BoardSub = "leaderboard" | "weekly";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

function marketToLocal(m: Market): PredictionMarket & { contractAddress?: string; deadline: string } {
  return {
    id: m.id,
    title: m.title,
    asset: m.asset,
    category: m.category,
    windowLabel: formatDeadline(m.deadline),
    volumeLabel: m.volume_label,
    ranges: m.ranges,
    image: m.image_url ?? undefined,
    status: m.status,
    contractAddress: m.contract_address ?? undefined,
    deadline: m.deadline,
  };
}

export function RangeFrenzyHome({ address, profile, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>("play");
  const [boardSub, setBoardSub] = useState<BoardSub>("leaderboard");
  const claimBadgeActive = useAppStore((s) => s.claimBadgeActive);
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding);
  const [selected, setSelected] = useState<{
    market: PredictionMarket & { contractAddress?: string; deadline?: string };
    range: PredictionRange;
  } | null>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [marketImages, setMarketImages] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMarketId, setUploadingMarketId] = useState<string | null>(null);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);

  const [showFilter, setShowFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredMarkets, setFilteredMarkets] = useState<PredictionMarket[]>([]);

  const timeFilters = ["Today", "24 Hours", "Popular", "Trending", "This Week"];
  const categories = ["Sports", "Crypto", "Politics", "Entertainment", "Tech"];

  useEffect(() => {
    async function fetchMarkets() {
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        setMarkets(data.map(marketToLocal));
      } else {
        setMarkets(FALLBACK_MARKETS);
      }
      setLoadingMarkets(false);
    }
    fetchMarkets();
  }, []);

  useEffect(() => {
    const now = new Date();
    // Issue 6 fix: client-side deadline filter so expired markets disappear immediately
    let result = markets.filter((m) => {
      const deadline = (m as any).deadline;
      return !deadline || new Date(deadline) > now;
    });
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.asset.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter(
        (m) => m.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    setFilteredMarkets(result);
  }, [filterSearch, selectedCategory, markets]);

  const handleImageUpload = (marketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setMarketImages((prev) => ({ ...prev, [marketId]: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const triggerImageUpload = (marketId: string) => {
    setUploadingMarketId(marketId);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // filteredMarkets already applies deadline + search + category filters

  return (
    <div className="relative min-h-dvh pb-24">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (uploadingMarketId) {
            handleImageUpload(uploadingMarketId, e);
            setUploadingMarketId(null);
          }
          e.target.value = "";
        }}
      />

      {/* ── STICKY APP HEADER ── */}
      {tab !== "profile" && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 lg:max-w-4xl">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-display text-lg font-bold tracking-tight">RangeFrenzy</span>
            </div>
            <div className="flex items-center gap-1">
              {tab === "play" && !showSearch && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSearch(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                  >
                    <Search01Icon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilter(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                  >
                    <FilterHorizontalIcon className="h-5 w-5" />
                  </button>
                </>
              )}
              {tab === "play" && showSearch && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search markets…"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="h-9 w-44 rounded-xl border border-input bg-muted px-3 text-sm outline-none ring-2 ring-transparent focus:ring-[#07955F]/30"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setShowSearch(false); setFilterSearch(""); }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                  >
                    <Cancel01Icon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
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

            {loadingMarkets ? (
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
                  const catKey = market.category.toLowerCase();
                  const chipClass = CATEGORY_CHIP[catKey] ?? "bg-muted text-muted-foreground border-border";
                  const gradientClass = CATEGORY_GRADIENT[catKey] ?? "from-muted to-muted/60";
                  return (
                    <li key={market.id}>
                      <button
                        type="button"
                        onClick={() => setSelected({ market, range: market.ranges[0] })}
                        className="group w-full rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-[#07955F]/30 hover:shadow-md"
                      >
                        <div className="relative mb-3 overflow-hidden rounded-2xl bg-muted">
                          {(marketImages[market.id] || market.image) ? (
                            <img
                              src={marketImages[market.id] || market.image}
                              alt={market.title}
                              className="h-36 w-full object-cover lg:h-44"
                            />
                          ) : (
                            <div className={cn("flex h-36 items-center justify-center bg-gradient-to-br lg:h-44", gradientClass)}>
                              <Camera01Icon className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); triggerImageUpload(market.id); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); triggerImageUpload(market.id); } }}
                            className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow backdrop-blur-sm transition hover:bg-background hover:text-foreground"
                            title="Add image"
                          >
                            <Camera01Icon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", chipClass)}>
                                {market.category}
                              </span>
                              <span className="text-[11px] text-muted-foreground">·</span>
                              <span className="text-[11px] font-medium text-muted-foreground">{market.asset}</span>
                            </div>
                            <p className="font-display text-base font-semibold leading-snug">{market.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{market.windowLabel}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#07955F]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#07955F] tabular-nums">
                              <Chart01Icon className="h-3 w-3" />
                              {market.volumeLabel.split(" ")[0]}
                            </span>
                            <ArrowRight01Icon className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[#07955F]" />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {market.ranges.map((r) => (
                            <span key={r.id} className="rounded-lg border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {r.label}
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
            {/* Board sub-tab switcher */}
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

            {/* Filter panel overlay */}
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

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</p>
                    <div className="flex flex-wrap gap-2">
                      {timeFilters.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(selectedTime === t ? null : t)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                            selectedTime === t
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
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
                        setSelectedTime(null);
                        setSelectedCategory(null);
                        setShowFilter(false);
                      }}
                    >
                      Cancel
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

            {boardSub === "leaderboard" ? (
              <LeaderboardSection />
            ) : (
              <WeeklyCampaignSection />
            )}
          </div>
        )}

        {/* ── CLAIM TAB ── */}
        {tab === "claim" && (
          <Suspense fallback={
            <div className="flex justify-center pt-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          }>
            <ClaimPage />
          </Suspense>
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
              { id: "claim" as Tab, label: "Claim", isClaim: true },
              { id: "profile" as Tab, icon: User02Icon, label: "You" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
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
                  {(item as any).isClaim ? (
                    <span className="relative">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2 border-current text-[9px] font-black leading-none")}>G$</span>
                      {claimBadgeActive && !active && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#07955F]" />
                      )}
                    </span>
                  ) : (() => { const Icon = (item as { icon: React.ElementType }).icon; return <Icon className="h-5 w-5" />; })()}
                </span>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── SOCIAL ONBOARDING MODAL ── */}
      {showOnboarding && (
        <SocialOnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {/* ── MARKET DETAIL MODAL ── */}
      {selected && !showStakeModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
            {(marketImages[selected.market.id] || selected.market.image) ? (
              <div className="overflow-hidden">
                <img
                  src={marketImages[selected.market.id] || selected.market.image}
                  alt={selected.market.title}
                  className="h-44 w-full object-cover"
                />
              </div>
            ) : (
              <div className={cn("flex h-28 items-center justify-center bg-gradient-to-br", CATEGORY_GRADIENT[selected.market.category.toLowerCase()] ?? "from-muted to-muted/60")}>
                <Chart01Icon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
            <div className="p-6">
              <div className="mb-1 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", CATEGORY_CHIP[selected.market.category.toLowerCase()] ?? "bg-muted text-muted-foreground border-border")}>
                  {selected.market.category}
                </span>
                <span className="text-xs text-muted-foreground">{selected.market.asset}</span>
              </div>
              <h3 className="font-display text-xl font-bold">{selected.market.title}</h3>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{selected.market.windowLabel}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#07955F]/10 px-2.5 py-0.5 text-xs font-bold text-[#07955F] tabular-nums">
                  <Chart01Icon className="h-3.5 w-3.5" />
                  {selected.market.volumeLabel.split(" ")[0]}
                </span>
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pick your range</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selected.market.ranges.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected({ ...selected, range: r })}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                      selected.range.id === r.id
                        ? "border-[#07955F] bg-[#07955F]/8 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-[#07955F]/40",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 rounded-2xl" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="flex-1 rounded-2xl bg-[#07955F] hover:bg-[#068050] text-white"
                  onClick={() => setShowStakeModal(true)}
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
          range={selected.range}
          address={address}
          onClose={() => { setShowStakeModal(false); setSelected(null); }}
          onSuccess={() => { setShowStakeModal(false); setSelected(null); }}
        />
      )}
    </div>
  );
}

/* ── Leaderboard Section — real data from Supabase stakes ── */
const PODIUM_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-gray-100 border-gray-400 text-gray-700",
  "bg-orange-100 border-orange-400 text-orange-800",
];
const PODIUM_ICONS = [MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon];

type LeaderRow = {
  wallet_address: string;
  username: string;
  avatar_url: string | null;
  total_staked: number;
  wins: number;
  total_bets: number;
};

function LeaderboardSection() {
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aggregate stakes grouped by wallet, joined with profiles
    supabase
      .from("stakes")
      .select("wallet_address, amount_gd, status, profile:profiles!stakes_wallet_address_fkey(username, avatar_url)")
      .then(({ data }) => {
        if (!data?.length) { setLoading(false); return; }

        // Group by wallet
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

/* ── Weekly Campaign — real data: top stakers this week ── */
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
