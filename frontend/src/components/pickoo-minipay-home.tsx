import { useState, useRef, useEffect } from "react";
import { Activity02Icon, User02Icon, Camera01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Chart01Icon } from "hugeicons-react";
import { FilterHorizontalIcon, Search01Icon, Cancel01Icon } from "hugeicons-react";
import { MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Market } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { FALLBACK_MARKETS, MOCK_LEADERBOARD, MOCK_WEEKLY_CAMPAIGN, formatDeadline } from "@/lib/markets";
import type { PredictionMarket, PredictionRange, LeaderboardEntry } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { ProfileView } from "@/components/profile-view";

type Tab = "play" | "board" | "profile";
type BoardSub = "leaderboard" | "weekly";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

function marketToLocal(m: Market): PredictionMarket {
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
  };
}

export function RangeFrenzyHome({ address, profile, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>("play");
  const [boardSub, setBoardSub] = useState<BoardSub>("leaderboard");
  const [selected, setSelected] = useState<{
    market: PredictionMarket;
    range: PredictionRange;
  } | null>(null);
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
    let result = markets;
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

  const activeMarkets = markets.filter((m) => m.status !== "resolved");

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] pb-24">
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

      <div className={cn("container mx-auto max-w-lg px-4 lg:max-w-4xl", tab === "profile" ? "pt-2" : "pt-6")}>

        {/* ── PLAY TAB ── */}
        {tab === "play" && (
          <div className="space-y-5">
            {/* Header with filter, title, search */}
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
                <button
                  type="button"
                  onClick={() => { setShowSearch(false); setFilterSearch(""); }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                >
                  <Cancel01Icon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilter(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                >
                  <FilterHorizontalIcon className="h-5 w-5" />
                </button>
                <div className="text-center flex-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Live ranges</h2>
                  <p className="text-sm text-muted-foreground">
                    Crypto, sports, weather & more — tap a market to view details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
                >
                  <Search01Icon className="h-5 w-5" />
                </button>
              </div>
            )}

            {loadingMarkets ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : (
              <ul className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {activeMarkets.map((market) => (
                  <li key={market.id}>
                    <button
                      type="button"
                      onClick={() => setSelected({ market, range: market.ranges[0] })}
                      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="relative mb-3 overflow-hidden rounded-xl bg-muted">
                        {(marketImages[market.id] || market.image) ? (
                          <img
                            src={marketImages[market.id] || market.image}
                            alt={market.title}
                            className="h-36 w-full object-cover lg:h-48"
                          />
                        ) : (
                          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20 lg:h-48">
                            <Camera01Icon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); triggerImageUpload(market.id); }}
                          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-background hover:text-foreground"
                          title="Add image"
                        >
                          <Camera01Icon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {market.category} · {market.asset}
                          </p>
                          <p className="font-display text-lg font-semibold">{market.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {market.windowLabel}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                            <Chart01Icon className="h-3 w-3" />
                            {market.volumeLabel.split(" ")[0]}
                          </span>
                          <ArrowRight01Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {market.ranges.map((r) => (
                          <span key={r.id} className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
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
            {/* Board header - just the sub-tab switcher */}
            <div className="flex gap-1 rounded-2xl border border-border bg-muted/40 p-1">
              {(["leaderboard", "weekly"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setBoardSub(sub)}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition",
                    boardSub === sub ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
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
              <>
                <div>
                  <h2 className="font-display text-xl font-bold">Weekly campaign</h2>
                  <p className="text-sm text-muted-foreground">This week&apos;s pool (demo).</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2 text-right">Pool</th>
                        <th className="px-3 py-2 text-right">Picks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_WEEKLY_CAMPAIGN.map((row) => (
                        <tr key={row.rank} className="border-t border-border bg-card">
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.rank}</td>
                          <td className="px-3 py-3 font-medium">
                            @{row.username}
                            {row.badge && (
                              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {row.badge}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{row.poolShare}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{row.picks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
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
          {(
            [
              { id: "play" as const, label: "Play", Icon: Activity02Icon },
              { id: "board" as const, label: "Board", Icon: Chart01Icon },
              { id: "profile" as const, label: "You", Icon: User02Icon },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition",
                tab === id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MARKET DETAIL MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            {(marketImages[selected.market.id] || selected.market.image) && (
              <div className="mb-4 overflow-hidden rounded-xl">
                <img
                  src={marketImages[selected.market.id] || selected.market.image}
                  alt={selected.market.title}
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {selected.market.category} · {selected.market.asset}
            </p>
            <h3 className="font-display text-xl font-bold">{selected.market.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.market.windowLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
                <Chart01Icon className="h-3.5 w-3.5" />
                {selected.market.volumeLabel.split(" ")[0]}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {selected.market.ranges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected({ ...selected, range: r })}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                    selected.range.id === r.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button type="button" variant="outline" className="flex-1 border-primary/30" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Leaderboard Section ── */
const PODIUM_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-gray-100 border-gray-400 text-gray-700",
  "bg-orange-100 border-orange-400 text-orange-800",
];
const PODIUM_ICONS = [MedalFirstPlaceIcon, MedalSecondPlaceIcon, MedalThirdPlaceIcon];

function LeaderboardSection() {
  const top3 = MOCK_LEADERBOARD.slice(0, 3);
  const rest = MOCK_LEADERBOARD.slice(3);

  return (
    <div>
      <div className="mb-1">
        <h2 className="font-display text-xl font-bold">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">Top performers this week</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {top3.map((entry, i) => {
          const Icon = PODIUM_ICONS[i];
          return (
            <div
              key={entry.rank}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center",
                PODIUM_COLORS[i]
              )}
            >
              <Icon className="h-6 w-6" />
              <LeaderboardAvatar entry={entry} size="md" />
              <div>
                <p className="text-xs font-bold leading-tight">@{entry.username}</p>
                <p className="text-sm font-bold tabular-nums">${entry.earnings}</p>
                <p className="text-[10px] opacity-70">
                  {entry.winRate === 0 ? "—" : `${Math.round(entry.winRate * 100)}%`} win
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4th+ in a list */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2 text-right">Earned</th>
              <th className="px-3 py-2 text-right">Win</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((row) => (
              <tr key={row.rank} className="border-t border-border bg-card">
                <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.rank}</td>
                <td className="px-3 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <LeaderboardAvatar entry={row} size="sm" />
                    @{row.username}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">${row.earnings}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {row.winRate === 0 ? "—" : `${Math.round(row.winRate * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderboardAvatar({ entry, size }: { entry: LeaderboardEntry; size: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  const initial = entry.username.charAt(0).toUpperCase();
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.username}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}
    >
      {initial}
    </div>
  );
}
