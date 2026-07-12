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
  if (!data.length)
    return (
      <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
        No data yet
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
            <span key={i} className="text-[10px] text-muted-foreground">
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
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
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
    if (marketsFilter === "active") return m.status === "active" && new Date(m.deadline) >= new Date();
    if (marketsFilter === "resolved") return m.status === "resolved";
    return true;
  });

  // ── Filtered stakes ───────────────────────────────────────────────────────
  const filteredStakes =
    stakesFilter === "all" ? stakes : stakes.filter((s) => s.status === stakesFilter);
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
        contractAddress ? "Market created on-chain!" : "Market created (off-chain)"
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
        const winningRanges = resolving.ranges
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => {
            const min = (r as any).min ?? (r as any).minPct;
            const max = (r as any).max ?? (r as any).maxPct;
            return outcomeNum >= min && (max === null || outcomeNum <= max);
          })
          .map(({ i }) => i);

        const { data: openStakes } = await supabase
          .from("stakes")
          .select("id, range_index, username")
          .eq("market_id", resolving.id)
          .eq("status", "open");

        if (openStakes?.length) {
          for (const stake of openStakes) {
            const won = winningRanges.includes(Number(stake.range_index));
            await supabase
              .from("stakes")
              .update({ status: won ? "won" : "lost" })
              .eq("id", stake.id);
            if (stake.username) {
              const rangeLabel =
                resolving.ranges?.[Number(stake.range_index)]?.label ??
                `Range ${stake.range_index}`;
              await sendNotification(
                stake.username,
                won ? "You won!" : "Market resolved",
                won
                  ? `Your prediction "${rangeLabel}" was correct in "${resolving.title}". Winnings credited!`
                  : `Your prediction "${rangeLabel}" didn't win in "${resolving.title}".`,
              );
            }
          }
        }
      }

      setResolving(null);
      setResolveValue("");
      fetchData();
    } catch (err) {
      console.error("Resolve error:", err);
      alert(`Resolution failed: ${err instanceof Error ? err.message : "Unknown error"}`);
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

    const winningRanges = market.ranges
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        const min = (r as any).min ?? (r as any).minPct;
        const max = (r as any).max ?? (r as any).maxPct;
        return outcomeNum >= min && (max === null || outcomeNum <= max);
      })
      .map(({ i }) => i);

    const { data: stakeData } = await supabase
      .from("stakes")
      .select("id, range_index")
      .eq("market_id", market.id)
      .in("status", ["open", "won", "lost"]);

    if (!stakeData?.length) {
      setReFixMsg("No stakes found for this market.");
      return;
    }
    for (const stake of stakeData) {
      const won = winningRanges.includes(Number(stake.range_index));
      await supabase
        .from("stakes")
        .update({ status: won ? "won" : "lost" })
        .eq("id", stake.id);
    }
    setReFixMsg(
      `Fixed ${stakeData.length} stake(s). Winning ranges: [${winningRanges.join(", ")}]`
    );
    setReFixMarket(null);
    setReFixValue("");
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
            <div className="flex h-6 items-center rounded-full bg-brand/10 px-3 text-[11px] font-semibold text-brand">
              RangeFrenzy Admin
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted/40 p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl py-2.5 text-center text-xs font-semibold transition",
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
                label="Total G$ Staked"
                value={fmtGD(totalStaked)}
                icon={<DollarSquareIcon className="h-5 w-5" />}
                color="green"
              />
              <OverviewCard
                label="Active Markets"
                value={String(activeMarkets.length)}
                icon={<Chart01Icon className="h-5 w-5" />}
                color="blue"
              />
              <OverviewCard
                label="Total Stakers"
                value={String(uniqueStakers)}
                icon={<UserGroupIcon className="h-5 w-5" />}
                color="purple"
              />
              <OverviewCard
                label="Win Rate"
                value={`${winRate}%`}
                icon={<ChartIncreaseIcon className="h-5 w-5" />}
                color="green"
              />
              <OverviewCard
                label="Pending Resolution"
                value={String(expiredMarkets.length)}
                icon={<Clock01Icon className="h-5 w-5" />}
                color={expiredMarkets.length > 0 ? "amber" : "default"}
              />
              <OverviewCard
                label="Total Users"
                value={String(profiles.length)}
                icon={<User02Icon className="h-5 w-5" />}
                color="default"
              />
            </div>

            {/* Volume chart */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Stakes Volume — Last 14 Days
              </p>
              <AreaChart data={volumeChartData} />
            </div>

            {/* Category breakdown + Donut */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category bars */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Category Breakdown
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Market Status
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Activity
                </p>
              </div>
              {stakes.length === 0 ? (
                <p className="px-4 pb-4 text-xs text-muted-foreground">No stakes yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  These markets have passed their deadline and need manual resolution.
                </p>
                {expiredMarkets.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <StatusBadge status="expired" />
                        <p className="mt-1 font-display font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.category} · {m.asset} · Expired{" "}
                          {new Date(m.deadline).toLocaleString()}
                        </p>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
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
                          Stored value: {m.winning_outcome ?? m.winning_value ?? "—"}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Won
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-600">
                  {stakes.filter((s) => s.status === "won").length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Lost
                </p>
                <p className="mt-0.5 text-sm font-bold text-red-600">
                  {stakes.filter((s) => s.status === "lost").length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                      <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                placeholder="0x… — leave blank if not yet deployed"
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
                color="default"
              />
              <OverviewCard
                label="GD Verified"
                value={String(verifiedCount)}
                subtext={`${profiles.length ? Math.round((verifiedCount / profiles.length) * 100) : 0}% of users`}
                icon={<Tick01Icon className="h-5 w-5" />}
                color="green"
              />
              <OverviewCard
                label="Total volume"
                value={fmtGD(totalUsersVolume)}
                icon={<DollarSquareIcon className="h-5 w-5" />}
                color="purple"
              />
              <OverviewCard
                label="Active (7d)"
                value={String(activeLast7d)}
                subtext={`${profiles.length ? Math.round((activeLast7d / profiles.length) * 100) : 0}% of users`}
                icon={<Activity01Icon className="h-5 w-5" />}
                color="blue"
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
                <p className="text-xs text-muted-foreground">
                  Showing {filteredProfiles.length} user{filteredProfiles.length !== 1 ? "s" : ""}
                </p>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
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
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                  GD Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                  Unverified
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                              {volume > 0 ? fmtGD(volume) : <span className="text-muted-foreground/50">—</span>}
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
        {tab === "notify" && <NotifySection />}
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
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResolving(null);
                    setResolveValue("");
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
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "amber" | "default";
}) {
  const colorMap = {
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    default: "bg-card border-border text-muted-foreground",
  };
  const iconColor = {
    green: "text-emerald-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    default: "text-muted-foreground",
  };
  return (
    <div className={cn("rounded-2xl border p-4", colorMap[color])}>
      <div className={cn("flex items-center gap-1.5 mb-2", iconColor[color])}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-display text-xl font-bold tabular-nums text-foreground">{value}</p>
      {subtext && <p className={cn("mt-0.5 text-[11px]", iconColor[color])}>{subtext}</p>}
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
            {m.image_url && (
              <img
                src={m.image_url}
                alt={m.title}
                className="mb-3 h-28 w-full rounded-xl object-cover"
              />
            )}
            <div className="flex items-start justify-between gap-3">
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
function NotifySection() {
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !title.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const usernames = username
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
      for (const u of usernames) {
        await sendNotification(u, title, body || undefined);
      }
      setMsg(`Sent to ${usernames.length} user${usernames.length > 1 ? "s" : ""}`);
      setTitle("");
      setBody("");
    } catch (err) {
      setMsg(`Error: ${(err as Error).message}`);
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <Field label="Username(s)">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="sammajayi, ekenepaul"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Separate multiple usernames with commas
        </p>
      </Field>
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          className={inputCls}
          required
        />
      </Field>
      <Field label="Body (optional)">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification body text"
          rows={3}
          className={inputCls + " resize-none pt-2"}
        />
      </Field>
      {msg && (
        <p
          className={cn(
            "text-sm font-medium",
            msg.startsWith("Sent") ? "text-emerald-600" : "text-destructive"
          )}
        >
          {msg}
        </p>
      )}
      <Button
        type="submit"
        className="w-full h-12 cursor-pointer font-semibold"
        disabled={sending}
      >
        {sending ? "Sending…" : "Send notification"}
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
        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
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

// ── Icons used inline in MarketList ──────────────────────────────────────────
function DollarSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <path d="M12 6v12M9 9a3 3 0 0 1 6 0c0 1.5-1 2.5-3 3-2 .5-3 1.5-3 3a3 3 0 0 0 6 0" />
    </svg>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30";
