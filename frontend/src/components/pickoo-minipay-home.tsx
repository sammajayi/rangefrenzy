import { useState, useRef, useEffect } from "react";
import { Activity02Icon, User02Icon, Camera01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Chart01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Market } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { FALLBACK_MARKETS, MOCK_LEADERBOARD, MOCK_WEEKLY_CAMPAIGN, formatDeadline } from "@/lib/markets";
import type { PredictionMarket, PredictionRange } from "@/lib/markets";
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
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">Live ranges</h2>
                <p className="text-sm text-muted-foreground">
                  Crypto, sports, weather & more — tap a market to view details.
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                {loadingMarkets ? "..." : "Live"}
              </span>
            </div>

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
                            {market.windowLabel} · {market.volumeLabel}
                          </p>
                        </div>
                        <ArrowRight01Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
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

            {boardSub === "leaderboard" ? (
              <>
                <div>
                  <h2 className="font-display text-xl font-bold">Top earners</h2>
                  <p className="text-sm text-muted-foreground">All-time standings (sample).</p>
                </div>
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
                      {MOCK_LEADERBOARD.map((row) => (
                        <tr key={row.rank} className="border-t border-border bg-card">
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.rank}</td>
                          <td className="px-3 py-3 font-medium">@{row.username}</td>
                          <td className="px-3 py-3 text-right tabular-nums">${row.earnings}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                            {row.winRate === 0 ? "—" : `${Math.round(row.winRate * 100)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="font-display text-xl font-bold">Weekly campaign</h2>
                  <p className="text-sm text-muted-foreground">This week's pool (demo).</p>
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
              {selected.market.windowLabel} · {selected.market.volumeLabel}
            </p>
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
