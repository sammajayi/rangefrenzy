"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, sendNotification } from "@/lib/supabase";
import type { Market, Profile, Stake } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PlusSignIcon,
  User02Icon,
  Chart01Icon,
  Copy01Icon,
  Tick01Icon,
  ImageUploadIcon,
  Clock01Icon,
  ChartIncreaseIcon,
  UserGroupIcon,
  Activity01Icon,
  Alert01Icon,
  DollarSquareIcon,
} from "hugeicons-react";
import { Link } from "wouter";
import { useWallets } from "@privy-io/react-auth";

type AdminTab = "overview" | "markets" | "expired" | "stakes" | "create" | "users" | "notify";
type RangeInput = { label: string; min: string; max: string };

const USERS_PER_PAGE = 10;
const STAKES_PER_PAGE = 20;

function rangeLabel(min: string, max: string, _i: number): string {
  if (max === "") return `${min}+`;
  return `${min} – ${max}`;
}

const defaultRanges: RangeInput[] = [
  { label: "0 – 9", min: "0", max: "9" },
  { label: "10 – 19", min: "10", max: "19" },
  { label: "20 – 29", min: "20", max: "29" },
  { label: "30+", min: "30", max: "" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Indexes of the ranges that contain `outcome`. A null max means open-ended. */
function winningRangeIndexes(ranges: unknown[], outcome: number): number[] {
  return ranges
    .map((r, i) => {
      const range = r as { min?: number; max?: number | null; minPct?: number; maxPct?: number | null };
      const min = range.min ?? range.minPct;
      const max = range.max ?? range.maxPct;
      return { i, hit: outcome >= (min as number) && (max === null || outcome <= (max as number)) };
    })
    .filter((x) => x.hit)
    .map((x) => x.i);
}

/** Marks stakes won or lost in two queries instead of one per stake, and throws on failure. */
async function setStakeStatuses(
  stakes: { id: string | number; range_index: number | string }[],
  winning: number[]
) {
  const won = stakes.filter((s) => winning.includes(Number(s.range_index))).map((s) => s.id);
  const lost = stakes.filter((s) => !winning.includes(Number(s.range_index))).map((s) => s.id);
  if (won.length) {
    const { error } = await supabase.from("stakes").update({ status: "won" }).in("id", won);
    if (error) throw error;
  }
  if (lost.length) {
    const { error } = await supabase.from("stakes").update({ status: "lost" }).in("id", lost);
    if (error) throw error;
  }
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** "Overdue by 3 days", for a deadline that has passed. */
function overdueLabel(deadline: string): string {
  const mins = Math.floor((Date.now() - new Date(deadline).getTime()) / 60_000);
  if (mins < 60) return "Overdue by less than an hour";
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `Overdue by ${hours} hour${hours === 1 ? "" : "s"}`;
  return `Overdue by ${Math.floor(hours / 24)} days`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmtGD(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0 G$";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M G$`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K G$`;
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)} G$`;
}

// ── SVG Charts ────────────────────────────────────────────────────────────────

function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length || data.every((d) => d.value === 0))
    return (
      <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
        No stakes in this period
      </div>
    );
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600;
  const H = 100;
  const PAD = 8;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return [x, y] as [number, number];
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[100px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07955F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#07955F" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#07955F" strokeWidth="2" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#07955F" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {data
          .filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0)
          .map((d, i) => (
            <span key={i} className="text-[11px] text-muted-foreground">
              {d.label}
            </span>
          ))}
      </div>
    </div>
  );
}

function DonutChart({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const R = 40;
  const CX = 60;
  const CY = 60;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map((sl, i) => {
          const dash = (sl.value / total) * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={sl.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: `${CX}px ${CY}px`,
              }}
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x={CX}
          y={CY + 5}
          textAnchor="middle"
          style={{ fontSize: 14, fontWeight: 700, fill: "currentColor" }}
        >
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((sl) => (
          <div key={sl.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: sl.color }}
            />
            <span className="text-muted-foreground">{sl.label}</span>
            <span className="font-semibold ml-auto pl-4">{sl.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Wallet copy button ────────────────────────────────────────────────────────
function WalletAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
      <span>
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 hover:text-primary transition-colors"
        title="Copy address"
      >
        {copied ? (
          <Tick01Icon className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy01Icon className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({
  status,
}: {
  status: "open" | "won" | "lost" | "refunded" | "active" | "resolved" | "expired";
}) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    won: "bg-emerald-100 text-emerald-700",
    lost: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-600",
    active: "bg-emerald-100 text-emerald-700",
    resolved: "bg-purple-100 text-purple-700",
    expired: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
        map[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { wallets } = useWallets();
  const providerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const w = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (w) providerRef.current = await w.getEthereumProvider();
    })();
  }, [wallets]);

  const [tab, setTab] = useState<AdminTab>("overview");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [walletActivity, setWalletActivity] = useState<
    Pick<Stake, "wallet_address" | "amount_gd" | "created_at">[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [stakesPage, setStakesPage] = useState(1);
  const [stakesFilter, setStakesFilter] = useState<"all" | "open" | "won" | "lost" | "refunded">(
    "all"
  );
  const [marketsFilter, setMarketsFilter] = useState<"all" | "active" | "resolved">("all");
  const [userSearch, setUserSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [stakeSearch, setStakeSearch] = useState("");
  const [usersFilter, setUsersFilter] = useState<"all" | "verified" | "unverified">("all");
  const [usersSort, setUsersSort] = useState<"active" | "volume" | "joined">("active");

  // Create form
  const [form, setForm] = useState({
    title: "",
    category: "Crypto",
    volume_label: "$0 staked",
    deadline: "",
    contract_address: "",
    initialPrice: "1",
    multiplier: "0.05",
    priceCap: "0",
  });
  const [ranges, setRanges] = useState<RangeInput[]>(defaultRanges);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createOk, setCreateOk] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resolve modal
  const [resolving, setResolving] = useState<Market | null>(null);
  const [resolveValue, setResolveValue] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [reFixMsg, setReFixMsg] = useState<string | null>(null);
  const [reFixMarket, setReFixMarket] = useState<Market | null>(null);
  const [reFixValue, setReFixValue] = useState("");

  // Image upload per market in list
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const marketImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: mData } = await supabase
      .from("markets")
      .select("*")
      .order("created_at", { ascending: false });
    if (mData) setMarkets(mData as Market[]);

    const { data: pData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (pData) setProfiles(pData as Profile[]);

    const { data: sData } = await supabase
      .from("stakes")
      .select("*, market:markets(title,asset,category,deadline,status,winning_value)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sData) setStakes(sData as Stake[]);

    // Full (uncapped) ledger, used to compute per-user volume/last-activity —
    // the 200-row cap above is fine for the recent-stakes list but would
    // undercount whales and miss older activity.
    const { data: waData } = await supabase
      .from("stakes")
      .select("wallet_address, amount_gd, created_at");
    if (waData) setWalletActivity(waData as Pick<Stake, "wallet_address" | "amount_gd" | "created_at">[]);

    setLoading(false);
  }

  // Derived
  const expiredMarkets = markets.filter(
    (m) => m.status !== "resolved" && new Date(m.deadline) < new Date()
  );
  const activeMarkets = markets.filter(
    (m) => m.status === "active" && new Date(m.deadline) >= new Date()
  );
  const resolvedMarkets = markets.filter((m) => m.status === "resolved");

  // ── Overview stats ────────────────────────────────────────────────────────
  const totalStaked = stakes.reduce((sum, s) => sum + (parseFloat(s.amount_gd) || 0), 0);
  const uniqueStakers = new Set(stakes.map((s) => s.wallet_address)).size;
  const wonCount = stakes.filter((s) => s.status === "won").length;
  const lostCount = stakes.filter((s) => s.status === "lost").length;
  const winRate =
    wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  // ── Volume chart data (last 14 days) ──────────────────────────────────────
  const volumeChartData = (() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const value = stakes
        .filter((s) => s.created_at.slice(0, 10) === key)
        .reduce((sum, s) => sum + (parseFloat(s.amount_gd) || 0), 0);
      days.push({ label, value });
    }
    return days;
  })();

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryBreakdown = (() => {
    const map: Record<string, number> = {};
    for (const m of markets) {
      map[m.category] = (map[m.category] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  // ── Filtered markets ──────────────────────────────────────────────────────
  const filteredMarkets = markets.filter((m) => {
    const q = marketSearch.trim().toLowerCase();
    if (q && !`${m.title} ${m.category} ${m.asset ?? ""}`.toLowerCase().includes(q)) return false;
    if (marketsFilter === "active") return m.status === "active" && new Date(m.deadline) >= new Date();
    if (marketsFilter === "resolved") return m.status === "resolved";
    return true;
  });

  // ── Filtered stakes ───────────────────────────────────────────────────────
  const filteredStakes = stakes.filter((s) => {
    if (stakesFilter !== "all" && s.status !== stakesFilter) return false;
    const q = stakeSearch.trim().toLowerCase();
    if (!q) return true;
    return `${s.wallet_address} ${s.market?.title ?? ""} ${s.range_label}`.toLowerCase().includes(q);
  });
  const stakesTotalPages = Math.max(1, Math.ceil(filteredStakes.length / STAKES_PER_PAGE));
  const pagedStakes = filteredStakes.slice(
    (stakesPage - 1) * STAKES_PER_PAGE,
    stakesPage * STAKES_PER_PAGE
  );

  // ── Per-wallet volume + last-activity ─────────────────────────────────────
  const walletVolume = new Map<string, number>();
  const walletLastStake = new Map<string, string>();
  for (const s of walletActivity) {
    const addr = s.wallet_address.toLowerCase();
    walletVolume.set(addr, (walletVolume.get(addr) ?? 0) + (parseFloat(s.amount_gd) || 0));
    const prev = walletLastStake.get(addr);
    if (!prev || new Date(s.created_at) > new Date(prev)) walletLastStake.set(addr, s.created_at);
  }
  // "Last seen" = most recent of an explicit login ping and their last stake tx.
  function lastActiveAt(p: Profile): string | null {
    const addr = p.wallet_address.toLowerCase();
    const candidates = [p.last_seen, walletLastStake.get(addr) ?? null].filter(
      (d): d is string => !!d
    );
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
  }
  const totalUsersVolume = Array.from(walletVolume.values()).reduce((s, v) => s + v, 0);
  const activeLast7d = profiles.filter((p) => {
    const t = lastActiveAt(p);
    return t && Date.now() - new Date(t).getTime() < 7 * 24 * 3_600_000;
  }).length;

  // ── Filtered + sorted users ────────────────────────────────────────────────
  const verifiedCount = profiles.filter((p) => p.is_whitelisted_gd).length;
  const filteredProfiles = profiles
    .filter((p) => {
      if (usersFilter === "verified" && !p.is_whitelisted_gd) return false;
      if (usersFilter === "unverified" && p.is_whitelisted_gd) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        p.username?.toLowerCase().includes(q) || p.wallet_address?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (usersSort === "volume") {
        const va = walletVolume.get(a.wallet_address.toLowerCase()) ?? 0;
        const vb = walletVolume.get(b.wallet_address.toLowerCase()) ?? 0;
        return vb - va;
      }
      if (usersSort === "joined") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const ta = lastActiveAt(a);
      const tb = lastActiveAt(b);
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
  const totalUsersPages = Math.max(1, Math.ceil(filteredProfiles.length / USERS_PER_PAGE));
  const pagedProfiles = filteredProfiles.slice(
    (usersPage - 1) * USERS_PER_PAGE,
    usersPage * USERS_PER_PAGE
  );

  async function uploadMarketImage(marketId: string, file: File): Promise<string> {
    const { ensureMarketImagesBucket } = await import("@/lib/supabase");
    await ensureMarketImagesBucket();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `markets/${marketId}.${ext}`;
    await supabase.storage.from("market-images").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("market-images").getPublicUrl(path);
    return data.publicUrl;
  }

  function deadlineToWindowLabel(deadlineStr: string): string {
    const d = new Date(deadlineStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return "Expired";
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
    if (diffH >= 24) {
      const days = Math.floor(diffH / 24);
      return `Resolves in ${days}d ${diffH % 24}h`;
    }
    return `Resolves in ${diffH}h ${diffM}m`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg("");
    setCreateOk(false);
    try {
      const parsedRanges = ranges.map((r, i) => ({
        id: `r${i}`,
        label: r.label,
        min: parseFloat(r.min),
        max: r.max === "" ? null : parseFloat(r.max),
      }));

      const window_label = deadlineToWindowLabel(form.deadline);
      const deadlineUnix = Math.floor(new Date(form.deadline).getTime() / 1000);

      let contractAddress: string | null = null;
      const provider = providerRef.current ?? (window as any).ethereum;
      if (provider) {
        const { createWalletClient, custom, parseUnits } = await import("viem");
        const { celo } = await import("viem/chains");
        const { marketFactoryAbi, FACTORY_ADDRESS, CATEGORY_MAP } = await import(
          "@/lib/contracts"
        );

        const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
        const adminAddr = accounts[0] as `0x${string}`;
        const walletClient = createWalletClient({
          account: adminAddr,
          chain: celo,
          transport: custom(provider),
        });

        const rangeLabels = parsedRanges.map((r) => r.label);
        const lowerBounds = parsedRanges.map((r) => BigInt(Math.round(r.min * 1e18)));
        const upperBounds = parsedRanges.map((r) =>
          r.max === null ? BigInt(1n << 255n) : BigInt(Math.round(r.max * 1e18))
        );

        const category = CATEGORY_MAP[form.category] ?? 0;
        const initialPrice = parseUnits(form.initialPrice || "1", 18);
        const multiplier = parseUnits(form.multiplier || "0.05", 18);
        const priceCap = parseUnits(form.priceCap || "0", 18);

        const hash = await walletClient.writeContract({
          address: FACTORY_ADDRESS,
          abi: marketFactoryAbi,
          functionName: "createMarket",
          args: [
            form.title,
            category,
            BigInt(deadlineUnix),
            parseUnits("1", 18),
            initialPrice,
            multiplier,
            priceCap,
            rangeLabels,
            lowerBounds,
            upperBounds,
          ],
        });

        const { createPublicClient, http } = await import("viem");
        const publicClient = createPublicClient({
          chain: celo,
          transport: http("https://forno.celo.org"),
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        const { decodeEventLog } = await import("viem");
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: marketFactoryAbi,
              data: log.data,
              topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
              strict: false,
            });
            if ((decoded as any).eventName === "MarketCreated") {
              contractAddress =
                ((decoded as any).args as any)?.marketProxy?.toLowerCase() ?? null;
              break;
            }
          } catch {
            /* skip */
          }
        }
      }

      const { data, error } = await supabase
        .from("markets")
        .insert({
          title: form.title,
          category: form.category,
          asset: "",
          window_label,
          volume_label: form.volume_label,
          deadline: new Date(form.deadline).toISOString(),
          ranges: parsedRanges,
          status: "active",
          contract_address: contractAddress ?? (form.contract_address.trim() || null),
        })
        .select()
        .single();

      if (error) throw error;

      if (imageFile && data) {
        const url = await uploadMarketImage(data.id, imageFile);
        await supabase.from("markets").update({ image_url: url }).eq("id", data.id);
      }

      if (data) {
        fetch("/api/markets/notify-new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, category: form.category, market_id: data.id }),
        }).catch((e) => console.error("notify-new failed:", e));
      }

      setCreateOk(true);
      setCreateMsg(
        contractAddress ? "Market created on-chain" : "Market created (off-chain)"
      );
      setForm({
        title: "",
        category: "Crypto",
        volume_label: "$0 staked",
        deadline: "",
        contract_address: "",
        initialPrice: "1",
        multiplier: "0.05",
        priceCap: "0",
      });
      setRanges(defaultRanges);
      setImageFile(null);
      setImagePreview(null);
      fetchData();
    } catch (err: unknown) {
      setCreateOk(false);
      setCreateMsg(`Error: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolving) return;
    setResolveLoading(true);
    setResolveError("");
    try {
      const outcomeNum = parseFloat(resolveValue);
      const contractAddress = (resolving as any).contract_address as string | null;
      if (contractAddress) {
        const { createWalletClient, createPublicClient, custom, http, parseUnits } = await import(
          "viem"
        );
        const { celo } = await import("viem/chains");
        const { marketFactoryAbi, FACTORY_ADDRESS } = await import("@/lib/contracts");

        const provider = providerRef.current ?? (window as any).ethereum;
        if (!provider) throw new Error("No wallet provider found.");
        const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
        const adminAddr = accounts[0] as `0x${string}`;

        const walletClient = createWalletClient({
          account: adminAddr,
          chain: celo,
          transport: custom(provider),
        });
        const publicClient = createPublicClient({
          chain: celo,
          transport: http("https://forno.celo.org"),
        });

        const outcomeWei = parseUnits(resolveValue, 18);
        const hash = await walletClient.writeContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: marketFactoryAbi,
          functionName: "resolveMarket",
          args: [contractAddress as `0x${string}`, outcomeWei],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const { error } = await supabase
        .from("markets")
        .update({
          status: "resolved",
          winning_value: outcomeNum,
          is_resolved: true,
          winning_outcome: resolveValue,
        })
        .eq("id", resolving.id);
      if (error) throw error;

      if (resolving.ranges?.length) {
        const winningRanges = winningRangeIndexes(resolving.ranges, outcomeNum);

        const { data: openStakes } = await supabase
          .from("stakes")
          .select("id, range_index, username")
          .eq("market_id", resolving.id)
          .eq("status", "open");

        if (openStakes?.length) {
          await setStakeStatuses(openStakes, winningRanges);
          await Promise.allSettled(
            openStakes
              .filter((stake) => stake.username)
              .map((stake) => {
                const won = winningRanges.includes(Number(stake.range_index));
                const rangeLabel =
                  resolving.ranges?.[Number(stake.range_index)]?.label ??
                  `Range ${stake.range_index}`;
                return sendNotification(
                  stake.username,
                  won ? "You won" : "Market resolved",
                  won
                    ? `Your range "${rangeLabel}" won in "${resolving.title}". Claim your winnings in the app.`
                    : `Your range "${rangeLabel}" didn't win in "${resolving.title}".`,
                );
              }),
          );
        }
      }

      setResolving(null);
      setResolveValue("");
      fetchData();
    } catch (err) {
      console.error("Resolve error:", err);
      setResolveError(
        `Resolution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setResolveLoading(false);
    }
  }

  async function handleReFix(e: React.FormEvent) {
    e.preventDefault();
    const market = reFixMarket;
    if (!market) return;
    if (!market.ranges?.length) {
      setReFixMsg("Market has no ranges stored.");
      return;
    }
    setReFixMsg(null);

    const rawVal =
      reFixValue.trim() || String(market.winning_outcome ?? market.winning_value ?? "");
    const outcomeNum = parseFloat(rawVal);
    if (isNaN(outcomeNum)) {
      setReFixMsg("Enter a valid winning value.");
      return;
    }

    try {
      const winningRanges = winningRangeIndexes(market.ranges, outcomeNum);

      const { data: stakeData } = await supabase
        .from("stakes")
        .select("id, range_index")
        .eq("market_id", market.id)
        .in("status", ["open", "won", "lost"]);

      if (!stakeData?.length) {
        setReFixMsg("No stakes found for this market.");
        return;
      }
      await setStakeStatuses(stakeData, winningRanges);
      setReFixMsg(
        `Fixed ${stakeData.length} stake(s). Winning ranges: [${winningRanges.join(", ")}]`
      );
      setReFixMarket(null);
      setReFixValue("");
    } catch (err) {
      console.error("Re-fix error:", err);
      setReFixMsg(
        `Couldn't update stakes: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  async function handleMarketImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;
    try {
      const url = await uploadMarketImage(uploadingId, file);
      await supabase.from("markets").update({ image_url: url }).eq("id", uploadingId);
      fetchData();
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    window.location.assign("/admin");
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "markets", label: "Markets" },
    {
      id: "expired",
      label: `Expired${expiredMarkets.length ? ` (${expiredMarkets.length})` : ""}`,
    },
    { id: "stakes", label: "Stakes" },
    { id: "create", label: "Create" },
    { id: "users", label: "Users" },
    { id: "notify", label: "Notify" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={marketImgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleMarketImageUpload}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              ← Home
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              <Activity01Icon className="h-3.5 w-3.5" />
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Tab bar */}
        <div role="tablist" aria-label="Admin sections" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl min-h-10 px-3 text-center text-sm font-medium transition",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <OverviewCard
                label="Total staked (G$)"
                value={fmtGD(totalStaked)}
                icon={<DollarSquareIcon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Active markets"
                value={String(activeMarkets.length)}
                icon={<Chart01Icon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Stakers"
                value={String(uniqueStakers)}
                icon={<UserGroupIcon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Settled stakes won"
                value={wonCount + lostCount > 0 ? `${winRate}%` : "None yet"}
                subtext={wonCount + lostCount > 0 ? `${wonCount} of ${wonCount + lostCount} settled` : undefined}
                icon={<ChartIncreaseIcon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Awaiting resolution"
                value={String(expiredMarkets.length)}
                icon={<Clock01Icon className="h-5 w-5" />}
                attention={expiredMarkets.length > 0}
              />
              <OverviewCard
                label="Users"
                value={String(profiles.length)}
                icon={<User02Icon className="h-5 w-5" />}
              />
            </div>

            {/* Volume chart */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Stakes volume, last 14 days
              </p>
              <AreaChart data={volumeChartData} />
            </div>

            {/* Category breakdown + Donut */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category bars */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Markets by category
                </p>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No markets yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {categoryBreakdown.map(([cat, count]) => {
                      const pct = Math.round((count / markets.length) * 100);
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{cat}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Donut */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Market status
                </p>
                <DonutChart
                  slices={[
                    { label: "Active", value: activeMarkets.length, color: "#07955F" },
                    { label: "Expired pending", value: expiredMarkets.length, color: "#F59E0B" },
                    { label: "Resolved", value: resolvedMarkets.length, color: "#3B82F6" },
                  ]}
                />
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Recent stakes
                </p>
              </div>
              {stakes.length === 0 ? (
                <p className="px-4 pb-4 text-xs text-muted-foreground">No stakes yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Market</th>
                        <th className="px-3 py-2">Range</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stakes.slice(0, 10).map((s) => (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">
                            {s.wallet_address.slice(0, 6)}…{s.wallet_address.slice(-4)}
                          </td>
                          <td className="px-3 py-2.5 max-w-[140px] truncate">
                            {s.market?.title ?? s.market_id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{s.range_label}</td>
                          <td className="px-3 py-2.5 font-semibold text-brand">
                            {fmtGD(s.amount_gd)}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            {timeAgo(s.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MARKETS ── */}
        {tab === "markets" && (
          <div className="space-y-4">
            <input
              type="search"
              aria-label="Search markets"
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              placeholder="Search markets by title or category…"
              className={inputCls}
            />
            {/* Filter chips */}
            <div className="flex gap-2">
              {(["all", "active", "resolved"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setMarketsFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold border transition",
                    marketsFilter === f
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? `All (${markets.length})` : f === "active" ? `Active (${activeMarkets.length})` : `Resolved (${resolvedMarkets.length})`}
                </button>
              ))}
            </div>

            <MarketList
              markets={filteredMarkets}
              stakes={stakes}
              loading={loading}
              onResolve={setResolving}
              onUploadImage={(id) => {
                setUploadingId(id);
                setTimeout(() => marketImgRef.current?.click(), 0);
              }}
            />
          </div>
        )}

        {/* ── EXPIRED / PENDING RESOLUTION ── */}
        {tab === "expired" && (
          <div className="space-y-3">
            {reFixMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {reFixMsg}
              </div>
            )}
            {expiredMarkets.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No expired markets pending resolution.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Oldest first. Stakers can&apos;t claim until each market is resolved.
                </p>
                {[...expiredMarkets]
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <StatusBadge status="expired" />
                        <p className="mt-1 font-display font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.category}
                          {m.asset ? ` · ${m.asset}` : ""} · Ended{" "}
                          {new Date(m.deadline).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-amber-700">{overdueLabel(m.deadline)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.ranges.map((r) => (
                            <span
                              key={r.id}
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"
                            >
                              {r.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setResolving(m)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Re-fix resolved markets */}
            {resolvedMarkets.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Re-apply resolution to stakes
                </p>
                {resolvedMarkets.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border bg-card p-4 mb-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Stored value: {m.winning_outcome ?? m.winning_value ?? "n/a"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => {
                          setReFixMarket(m);
                          setReFixValue(
                            String(m.winning_outcome ?? m.winning_value ?? "")
                          );
                        }}
                      >
                        Fix stakes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STAKES ── */}
        {tab === "stakes" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="search"
                aria-label="Search stakes"
                value={stakeSearch}
                onChange={(e) => { setStakeSearch(e.target.value); setStakesPage(1); }}
                placeholder="Search by wallet, market or range…"
                className={inputCls}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                disabled={filteredStakes.length === 0}
                onClick={() =>
                  downloadCsv("stakes.csv", [
                    ["Wallet", "Market", "Range", "Amount (G$)", "Status", "Created"],
                    ...filteredStakes.map((s) => [s.wallet_address, s.market?.title, s.range_label, s.amount_gd, s.status, s.created_at]),
                  ])
                }
              >
                Export CSV
              </Button>
            </div>
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {(["all", "open", "won", "lost", "refunded"] as const).map((f) => {
                const count =
                  f === "all"
                    ? stakes.length
                    : stakes.filter((s) => s.status === f).length;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setStakesFilter(f);
                      setStakesPage(1);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold border transition",
                      stakesFilter === f
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Total Amount
                </p>
                <p className="mt-0.5 text-sm font-bold text-brand">
                  {fmtGD(
                    filteredStakes.reduce(
                      (sum, s) => sum + (parseFloat(s.amount_gd) || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Won
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-600">
                  {stakes.filter((s) => s.status === "won").length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Lost
                </p>
                <p className="mt-0.5 text-sm font-bold text-red-600">
                  {stakes.filter((s) => s.status === "lost").length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Open
                </p>
                <p className="mt-0.5 text-sm font-bold text-blue-600">
                  {stakes.filter((s) => s.status === "open").length}
                </p>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : filteredStakes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No stakes found.</p>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Market</th>
                          <th className="px-3 py-2">Range</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedStakes.map((s, i) => (
                          <tr key={s.id} className="border-t border-border bg-card">
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">
                              {(stakesPage - 1) * STAKES_PER_PAGE + i + 1}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">
                              {s.wallet_address.slice(0, 6)}…{s.wallet_address.slice(-4)}
                            </td>
                            <td className="px-3 py-2.5 max-w-[150px] truncate">
                              {s.market?.title ?? s.market_id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {s.range_label}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-brand">
                              {fmtGD(s.amount_gd)}
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                              {timeAgo(s.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {stakesTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <button
                      type="button"
                      disabled={stakesPage === 1}
                      onClick={() => setStakesPage((p) => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
                    >
                      ← Prev
                    </button>
                    <span className="font-medium">
                      Page {stakesPage} of {stakesTotalPages} ({filteredStakes.length} stakes)
                    </span>
                    <button
                      type="button"
                      disabled={stakesPage === stakesTotalPages}
                      onClick={() => setStakesPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CREATE MARKET ── */}
        {tab === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="BTC move in 24h"
                required
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  {[
                    "Crypto",
                    "Sports",
                    "Local",
                    "Weather",
                    "Stocks",
                    "Social Media",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Volume label">
                <input
                  value={form.volume_label}
                  onChange={(e) => setForm({ ...form, volume_label: e.target.value })}
                  placeholder="$0 staked"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Deadline">
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                required
                className={inputCls}
              />
            </Field>

            <Field label="Contract address (optional)">
              <input
                type="text"
                value={form.contract_address}
                onChange={(e) => setForm({ ...form, contract_address: e.target.value })}
                placeholder="0x… (leave blank if not yet deployed)"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The deployed RangeFrenzyMarket proxy for this market. Enables on-chain staking
                and resolution.
              </p>
            </Field>

            {/* Bonding curve params */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bonding curve
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Initial price (G$)">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.initialPrice}
                    onChange={(e) => setForm({ ...form, initialPrice: e.target.value })}
                    placeholder="1"
                    className={inputCls}
                  />
                </Field>
                <Field label="Multiplier (G$)">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.multiplier}
                    onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                    placeholder="0.05"
                    className={inputCls}
                  />
                </Field>
                <Field label="Price cap (0 = none)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.priceCap}
                    onChange={(e) => setForm({ ...form, priceCap: e.target.value })}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Price per share = initialPrice + multiplier × totalStaked / 1e18. Price cap
                of 0 means no ceiling.
              </p>
            </div>

            {/* Image upload */}
            <Field label="Market image">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-6 transition hover:border-primary/40"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <ImageUploadIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImageFile(f);
                  const reader = new FileReader();
                  reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(f);
                }}
              />
            </Field>

            {/* Ranges */}
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Ranges
              </label>
              <div className="space-y-2">
                {ranges.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={r.label}
                      onChange={(e) => {
                        const next = [...ranges];
                        next[i] = { ...next[i], label: e.target.value };
                        setRanges(next);
                      }}
                      placeholder="Label"
                      className={cn(inputCls, "w-24")}
                    />
                    <input
                      value={r.min}
                      onChange={(e) => {
                        const next = [...ranges];
                        const min = e.target.value;
                        const max = next[i].max;
                        const prev = ranges[i];
                        const prevLabel = rangeLabel(prev.min, prev.max, i);
                        const label =
                          prev.label === prevLabel ? rangeLabel(min, max, i) : prev.label;
                        next[i] = { ...next[i], min, label };
                        setRanges(next);
                      }}
                      placeholder="Min"
                      type="number"
                      step="0.01"
                      className={cn(inputCls, "w-20")}
                    />
                    <input
                      value={r.max}
                      onChange={(e) => {
                        const next = [...ranges];
                        const max = e.target.value;
                        const min = next[i].min;
                        const prev = ranges[i];
                        const prevLabel = rangeLabel(prev.min, prev.max, i);
                        const label =
                          prev.label === prevLabel ? rangeLabel(min, max, i) : prev.label;
                        next[i] = { ...next[i], max, label };
                        setRanges(next);
                      }}
                      placeholder="Max"
                      type="number"
                      step="0.01"
                      className={cn(inputCls, "w-20")}
                    />
                    {ranges.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setRanges(ranges.filter((_, j) => j !== i))}
                        className="px-2 text-destructive hover:text-destructive/80 text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRanges([...ranges, { label: "", min: "", max: "" }])}
                className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
              >
                <PlusSignIcon className="h-4 w-4" /> Add range
              </button>
            </div>

            {createMsg && (
              <p
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  createOk ? "text-emerald-600" : "text-destructive"
                )}
              >
                {createOk ? (
                  <Tick01Icon className="h-4 w-4 shrink-0" />
                ) : (
                  <Alert01Icon className="h-4 w-4 shrink-0" />
                )}
                {createMsg}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base cursor-pointer font-semibold"
              disabled={createLoading}
            >
              {createLoading ? "Creating…" : "Create market"}
            </Button>
          </form>
        )}

        {/* ── USERS TABLE ── */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <OverviewCard
                label="Total users"
                value={String(profiles.length)}
                icon={<User02Icon className="h-5 w-5" />}
              />
              <OverviewCard
                label="GD Verified"
                value={String(verifiedCount)}
                subtext={`${profiles.length ? Math.round((verifiedCount / profiles.length) * 100) : 0}% of users`}
                icon={<Tick01Icon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Total volume"
                value={fmtGD(totalUsersVolume)}
                icon={<DollarSquareIcon className="h-5 w-5" />}
              />
              <OverviewCard
                label="Active (7d)"
                value={String(activeLast7d)}
                subtext={`${profiles.length ? Math.round((activeLast7d / profiles.length) * 100) : 0}% of users`}
                icon={<Activity01Icon className="h-5 w-5" />}
              />
            </div>

            {/* Search */}
            <input
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
              placeholder="Search by username or wallet…"
              className={cn(inputCls, "w-full")}
            />

            {/* Filter + sort row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {(["all", "verified", "unverified"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setUsersFilter(f); setUsersPage(1); }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition border",
                      usersFilter === f
                        ? f === "verified"
                          ? "bg-brand text-white border-brand"
                          : "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    )}
                  >
                    {f === "all" ? `All (${profiles.length})` : f === "verified" ? `GD Verified (${verifiedCount})` : `Unverified (${profiles.length - verifiedCount})`}
                  </button>
                ))}
              </div>
              <select
                value={usersSort}
                onChange={(e) => setUsersSort(e.target.value as typeof usersSort)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-foreground/40 transition cursor-pointer"
              >
                <option value="active">Sort: Recently active</option>
                <option value="volume">Sort: Highest volume</option>
                <option value="joined">Sort: Newest joined</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredProfiles.length} user{filteredProfiles.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() =>
                      downloadCsv("users.csv", [
                        ["Username", "Wallet", "Email", "GoodDollar verified", "Volume (G$)", "Joined"],
                        ...filteredProfiles.map((p) => [
                          p.username, p.wallet_address, p.email, p.is_whitelisted_gd ? "yes" : "no",
                          walletVolume.get(p.wallet_address.toLowerCase()) ?? 0, p.created_at,
                        ]),
                      ])
                    }
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Wallet</th>
                        <th className="px-3 py-2">GD Status</th>
                        <th className="px-3 py-2 text-right">Volume</th>
                        <th className="px-3 py-2 text-right">Last seen</th>
                        <th className="px-3 py-2 text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedProfiles.map((p) => {
                        const volume = walletVolume.get(p.wallet_address.toLowerCase()) ?? 0;
                        const lastActive = lastActiveAt(p);
                        const isRecentlyActive =
                          !!lastActive && Date.now() - new Date(lastActive).getTime() < 24 * 3_600_000;
                        return (
                          <tr
                            key={p.wallet_address}
                            className={cn(
                              "border-t border-border",
                              p.is_whitelisted_gd ? "bg-brand/3" : "bg-card"
                            )}
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold uppercase">
                                  {(p.username ?? "?").slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-medium">@{p.username}</p>
                                  {p.email && <p className="text-[11px] text-muted-foreground">{p.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <WalletAddress address={p.wallet_address} />
                            </td>
                            <td className="px-3 py-3">
                              {p.is_whitelisted_gd ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                  GD Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                  Unverified
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                              {volume > 0 ? fmtGD(volume) : <span className="text-muted-foreground/50">n/a</span>}
                            </td>
                            <td className="px-3 py-3 text-right text-xs">
                              {lastActive ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1",
                                    isRecentlyActive ? "text-brand font-semibold" : "text-muted-foreground"
                                  )}
                                >
                                  {isRecentlyActive && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                                  {timeAgo(lastActive)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">Never</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalUsersPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <button
                      type="button"
                      disabled={usersPage === 1}
                      onClick={() => setUsersPage((p) => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
                    >
                      ← Prev
                    </button>
                    <span className="font-medium">
                      Page {usersPage} of {totalUsersPages}
                    </span>
                    <button
                      type="button"
                      disabled={usersPage === totalUsersPages}
                      onClick={() => setUsersPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── NOTIFY ── */}
        {tab === "notify" && <NotifySection profiles={profiles} />}
      </div>

      {/* ── RE-FIX MODAL ── */}
      {reFixMarket && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Fix stake outcomes</h3>
            <p className="mt-1 text-sm text-muted-foreground">{reFixMarket.title}</p>
            <form onSubmit={handleReFix} className="mt-4 space-y-4">
              {reFixMarket.ranges?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ranges
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {reFixMarket.ranges.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px]"
                      >
                        <span className="font-mono text-muted-foreground mr-1">[{i}]</span>
                        {r.label} ({(r as any).min ?? "–"} – {(r as any).max ?? "∞"})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Correct winning value">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter the actual outcome"
                  value={reFixValue}
                  onChange={(e) => setReFixValue(e.target.value)}
                  required
                  className={inputCls}
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This will re-mark all open/won/lost stakes for this market.
                </p>
              </Field>
              {reFixMsg && (
                <p className="text-sm font-medium text-emerald-600">{reFixMsg}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setReFixMarket(null);
                    setReFixValue("");
                    setReFixMsg(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Apply fix
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESOLVE MODAL ── */}
      {resolving && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Resolve market</h3>
            <p className="mt-1 text-sm text-muted-foreground">{resolving.title}</p>
            <form onSubmit={handleResolve} className="mt-4 space-y-4">
              {resolving.ranges?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ranges
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resolving.ranges.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px]"
                      >
                        <span className="font-mono text-muted-foreground mr-1">[{i}]</span>
                        {r.label} ({r.min ?? "–"} – {r.max ?? "∞"})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Actual outcome value">
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3.5 or 1500000"
                  value={resolveValue}
                  onChange={(e) => setResolveValue(e.target.value)}
                  required
                  className={inputCls}
                  autoFocus
                />
              </Field>
              {resolveError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {resolveError}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResolving(null);
                    setResolveValue("");
                    setResolveError("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={resolveLoading}>
                  {resolveLoading ? "Resolving…" : "Confirm & Resolve"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview card ─────────────────────────────────────────────────────────────
function OverviewCard({
  label,
  value,
  subtext,
  icon,
  attention = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  /** Something here needs the admin to act. */
  attention?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        attention ? "border-amber-300 bg-amber-50" : "border-border bg-card"
      )}
    >
      <div className={cn("mb-2 flex items-center gap-1.5", attention ? "text-amber-700" : "text-muted-foreground")}>
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}

// ── Market list sub-component ─────────────────────────────────────────────────
function MarketList({
  markets,
  stakes,
  loading,
  onResolve,
  onUploadImage,
}: {
  markets: Market[];
  stakes: Stake[];
  loading: boolean;
  onResolve: (m: Market) => void;
  onUploadImage: (id: string) => void;
}) {
  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  if (markets.length === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No markets to show.
      </p>
    );

  return (
    <div className="space-y-3">
      {markets.map((m) => {
        const mStakes = stakes.filter((s) => s.market_id === m.id);
        const poolGD = mStakes.reduce((sum, s) => sum + (parseFloat(s.amount_gd) || 0), 0);
        const stakerCount = new Set(mStakes.map((s) => s.wallet_address)).size;
        const isExpired =
          m.status !== "resolved" && new Date(m.deadline) < new Date();
        const deadlineDiff = new Date(m.deadline).getTime() - Date.now();
        const daysLeft = Math.floor(deadlineDiff / 86_400_000);
        const hoursLeft = Math.floor((deadlineDiff % 86_400_000) / 3_600_000);
        const countdown =
          deadlineDiff <= 0
            ? "Expired"
            : daysLeft > 0
            ? `${daysLeft}d ${hoursLeft}h left`
            : `${hoursLeft}h left`;

        return (
          <div
            key={m.id}
            className={cn(
              "rounded-2xl border bg-card p-4",
              isExpired ? "border-amber-200" : "border-border"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              {m.image_url && (
                <img
                  src={m.image_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl bg-muted object-contain p-1"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge
                    status={
                      m.status === "resolved"
                        ? "resolved"
                        : isExpired
                        ? "expired"
                        : "active"
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {m.category}
                    {m.asset ? ` · ${m.asset}` : ""}
                  </span>
                </div>
                <p className="font-display font-semibold">{m.title}</p>
                {m.status === "resolved" && m.winning_outcome && (
                  <p className="mt-0.5 text-xs text-purple-600 font-medium">
                    Resolved: {m.winning_outcome}
                  </p>
                )}
                {/* Stats row */}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSquareIcon className="h-3.5 w-3.5" />
                    {fmtGD(poolGD)} pool
                  </span>
                  <span className="flex items-center gap-1">
                    <User02Icon className="h-3.5 w-3.5" />
                    {stakerCount} staker{stakerCount !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      deadlineDiff <= 0 ? "text-amber-600" : ""
                    )}
                  >
                    <Clock01Icon className="h-3.5 w-3.5" />
                    {countdown}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {m.status !== "resolved" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => onResolve(m)}
                  >
                    Resolve
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => onUploadImage(m.id)}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
                  title="Upload image"
                >
                  <ImageUploadIcon className="h-3.5 w-3.5" /> Image
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.ranges.map((r) => (
                <span
                  key={r.id}
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[11px]",
                    m.status === "resolved" &&
                      m.winning_value !== null &&
                      m.winning_value !== undefined &&
                      (r as any).min <= m.winning_value &&
                      ((r as any).max === null || m.winning_value <= (r as any).max)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Notify ────────────────────────────────────────────────────────────────────
function NotifySection({ profiles }: { profiles: Profile[] }) {
  const [audience, setAudience] = useState<"users" | "everyone">("users");
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const known = new Set(profiles.map((p) => p.username.toLowerCase()));
  const typed = username.split(",").map((u) => u.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
  const unknown = typed.filter((u) => !known.has(u));
  const recipients = audience === "everyone" ? profiles.map((p) => p.username.toLowerCase()) : typed.filter((u) => known.has(u));
  const canSend = title.trim().length > 0 && recipients.length > 0 && !sending;

  const send = async () => {
    setSending(true);
    setResult(null);
    const { error } = await supabase
      .from("notifications")
      .insert(recipients.map((u) => ({ username: u, title: title.trim(), body: body.trim() || null })));
    setSending(false);
    setConfirming(false);
    if (error) {
      setResult({ ok: false, text: `Couldn't send: ${error.message}` });
      return;
    }
    setResult({ ok: true, text: `Sent to ${recipients.length} user${recipients.length === 1 ? "" : "s"}.` });
    setTitle("");
    setBody("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    // Messaging everyone can't be undone, so ask once.
    if (audience === "everyone" && !confirming) {
      setConfirming(true);
      return;
    }
    void send();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div role="radiogroup" aria-label="Audience" className="flex gap-2">
        {([["users", "Specific users"], ["everyone", `Everyone (${profiles.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={audience === id}
            onClick={() => { setAudience(id); setConfirming(false); }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              audience === id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {audience === "users" && (
        <Field label="Usernames">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="sammajayi, ekenepaul"
            className={inputCls}
          />
          <p className={cn("mt-1 text-xs", unknown.length ? "text-destructive" : "text-muted-foreground")}>
            {unknown.length
              ? `No user named ${unknown.map((u) => `@${u}`).join(", ")}. They will be skipped.`
              : "Separate several usernames with commas."}
          </p>
        </Field>
      )}

      <Field label="Title">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setConfirming(false); }}
          maxLength={80}
          placeholder="Notification title"
          className={inputCls}
          required
        />
      </Field>
      <Field label="Message (optional)">
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setConfirming(false); }}
          maxLength={240}
          placeholder="What do you want them to know?"
          rows={3}
          className={inputCls + " resize-none pt-2"}
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{body.length}/240</p>
      </Field>

      {title.trim() && (
        <div aria-label="Preview" className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
          <p className="text-sm font-semibold">{title}</p>
          {body.trim() && <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>}
        </div>
      )}

      {result && (
        <p role="status" className={cn("text-sm font-medium", result.ok ? "text-emerald-600" : "text-destructive")}>
          {result.text}
        </p>
      )}

      <Button type="submit" className="h-12 w-full font-semibold" disabled={!canSend}>
        {sending
          ? "Sending…"
          : confirming
          ? `Confirm: send to all ${recipients.length} users`
          : recipients.length > 0
          ? `Send to ${recipients.length} user${recipients.length === 1 ? "" : "s"}`
          : "Send notification"}
      </Button>
    </form>
  );
}

// ── Shared sub-helpers ────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-3 py-3",
        accent && value > 0 ? "border-amber-300 bg-amber-50/50" : "border-border"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums",
          accent && value > 0 ? "text-amber-700" : ""
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30";
