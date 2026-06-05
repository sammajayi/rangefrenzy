"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Market, Profile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PlusSignIcon,
  CheckmarkCircle01Icon,
  User02Icon,
  Chart01Icon,
  Copy01Icon,
  Tick01Icon,
  ImageUploadIcon,
} from "hugeicons-react";
import { Link } from "wouter";

type AdminTab = "markets" | "expired" | "create" | "users";
type RangeInput = { label: string; minPct: string; maxPct: string };

const USERS_PER_PAGE = 10;

const defaultRanges: RangeInput[] = [
  { label: "0% – 2%", minPct: "0", maxPct: "2" },
  { label: "2% – 5%", minPct: "2", maxPct: "5" },
  { label: "5% – 10%", minPct: "5", maxPct: "10" },
  { label: "Above 10%", minPct: "10", maxPct: "" },
];

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
      <span>{address.slice(0, 6)}…{address.slice(-4)}</span>
      <button type="button" onClick={handleCopy} className="p-1 hover:text-primary transition-colors" title="Copy address">
        {copied
          ? <Tick01Icon className="h-3.5 w-3.5 text-green-500" />
          : <Copy01Icon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("markets");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [usersPage, setUsersPage] = useState(1);

  // Create form
  const [form, setForm] = useState({
    title: "",
    asset: "",
    category: "Crypto",
    window_label: "",
    volume_label: "$0 staked",
    deadline: "",
  });
  const [ranges, setRanges] = useState<RangeInput[]>(defaultRanges);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resolve modal
  const [resolving, setResolving] = useState<Market | null>(null);
  const [resolveValue, setResolveValue] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);

  // Image upload per market in list
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const marketImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function fetchData() {
    setLoading(true);
    const { data: mData } = await supabase
      .from("markets")
      .select("*")
      .order("created_at", { ascending: false });
    if (mData) setMarkets(mData as Market[]);

    if (tab === "users") {
      const { data: pData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pData) setProfiles(pData as Profile[]);
    }
    setLoading(false);
  }

  // Markets past deadline that aren't resolved
  const expiredMarkets = markets.filter(
    (m) => m.status !== "resolved" && new Date(m.deadline) < new Date()
  );
  const activeMarkets = markets.filter(
    (m) => m.status === "active" && new Date(m.deadline) >= new Date()
  );

  async function uploadMarketImage(marketId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `markets/${marketId}.${ext}`;
    await supabase.storage.from("market-images").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("market-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg("");
    try {
      const parsedRanges = ranges.map((r, i) => ({
        id: `r${i}`,
        label: r.label,
        minPct: parseFloat(r.minPct),
        maxPct: r.maxPct === "" ? null : parseFloat(r.maxPct),
      }));

      const { data, error } = await supabase
        .from("markets")
        .insert({
          title: form.title,
          asset: form.asset,
          category: form.category,
          window_label: form.window_label,
          volume_label: form.volume_label,
          deadline: new Date(form.deadline).toISOString(),
          ranges: parsedRanges,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Upload image if provided
      if (imageFile && data) {
        const url = await uploadMarketImage(data.id, imageFile);
        await supabase.from("markets").update({ image_url: url }).eq("id", data.id);
      }

      setCreateMsg("✓ Market created successfully!");
      setForm({ title: "", asset: "", category: "Crypto", window_label: "", volume_label: "$0 staked", deadline: "" });
      setRanges(defaultRanges);
      setImageFile(null);
      setImagePreview(null);
      fetchData();
    } catch (err: unknown) {
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

      // 1. Call on-chain resolve() if the market has a contract address
      const contractAddress = (resolving as any).contract_address as string | null;
      if (contractAddress) {
        const { useWallets } = await import("@privy-io/react-auth");
        // We can't use hooks here — import viem directly and use window.ethereum
        const { createWalletClient, createPublicClient, custom, http, parseUnits } = await import("viem");
        const { celo, celoAlfajores } = await import("viem/chains");
        const { MARKET_ABI } = await import("@/lib/contracts");

        const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "44787");
        const chain = chainId === 42220 ? celo : celoAlfajores;
        const rpc = chainId === 42220 ? "https://forno.celo.org" : "https://alfajores-forno.celo-testnet.org";

        // Get the connected wallet via window.ethereum (admin is always authenticated)
        const provider = (window as any).ethereum;
        if (!provider) throw new Error("No wallet provider found in browser.");

        const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
        const adminAddr = accounts[0] as `0x${string}`;

        const walletClient = createWalletClient({ account: adminAddr, chain, transport: custom(provider) });
        const publicClient = createPublicClient({ chain, transport: http(rpc) });

        // outcome scaled to 18 decimals (e.g. 3.5% → 3.5e18)
        const outcomeWei = parseUnits(resolveValue, 18);
        const hash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: MARKET_ABI,
          functionName: "resolve",
          args: [outcomeWei],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // 2. Update Supabase
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

      // 3. Mark stakes as won/lost
      if (resolving.ranges?.length) {
        const winningRanges = resolving.ranges
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => outcomeNum >= r.minPct && (r.maxPct === null || outcomeNum <= r.maxPct))
          .map(({ i }) => i);

        const { data: openStakes } = await supabase
          .from("stakes")
          .select("id, range_index")
          .eq("market_id", resolving.id)
          .eq("status", "open");

        if (openStakes?.length) {
          for (const stake of openStakes) {
            const won = winningRanges.includes(stake.range_index);
            await supabase.from("stakes").update({ status: won ? "won" : "lost" }).eq("id", stake.id);
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

  // Pagination for users
  const totalPages = Math.max(1, Math.ceil(profiles.length / USERS_PER_PAGE));
  const pagedProfiles = profiles.slice(
    (usersPage - 1) * USERS_PER_PAGE,
    usersPage * USERS_PER_PAGE
  );

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "markets", label: "Markets" },
    { id: "expired", label: `Expired${expiredMarkets.length ? ` (${expiredMarkets.length})` : ""}` },
    { id: "create", label: "Create" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <input ref={marketImgRef} type="file" accept="image/*" className="hidden" onChange={handleMarketImageUpload} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              ← Home
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <div className="flex h-6 items-center rounded-full bg-[#07955F]/10 px-3 text-[11px] font-semibold text-[#07955F]">
            RangeFrenzy Admin
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Stat chips */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          <StatChip label="Active" value={activeMarkets.length} icon={<Chart01Icon className="h-4 w-4" />} />
          <StatChip label="Expired" value={expiredMarkets.length} icon={<CheckmarkCircle01Icon className="h-4 w-4" />} accent={expiredMarkets.length > 0} />
          <StatChip label="Resolved" value={markets.filter((m) => m.status === "resolved").length} icon={<Tick01Icon className="h-4 w-4" />} />
          <StatChip label="Users" value={profiles.length} icon={<User02Icon className="h-4 w-4" />} />
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-center text-xs font-semibold transition",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ACTIVE MARKETS ── */}
        {tab === "markets" && (
          <MarketList
            markets={activeMarkets}
            loading={loading}
            onResolve={setResolving}
            onUploadImage={(id) => { setUploadingId(id); setTimeout(() => marketImgRef.current?.click(), 0); }}
          />
        )}

        {/* ── EXPIRED / PENDING RESOLUTION ── */}
        {tab === "expired" && (
          <div className="space-y-3">
            {expiredMarkets.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No expired markets pending resolution.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  These markets have passed their deadline and need manual resolution.
                </p>
                {expiredMarkets.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                          Awaiting resolution
                        </span>
                        <p className="mt-1 font-display font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.category} · {m.asset} · Expired {new Date(m.deadline).toLocaleString()}
                        </p>
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
          </div>
        )}

        {/* ── CREATE MARKET ── */}
        {tab === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="BTC move in 24h" required className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asset">
                <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} placeholder="BTC" required className={inputCls} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                  {["Crypto", "Sports", "Weather", "Stocks", "Local"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Window label">
                <input value={form.window_label} onChange={(e) => setForm({ ...form, window_label: e.target.value })} placeholder="Resolves in 24h" required className={inputCls} />
              </Field>
              <Field label="Volume label">
                <input value={form.volume_label} onChange={(e) => setForm({ ...form, volume_label: e.target.value })} placeholder="$0 staked" className={inputCls} />
              </Field>
            </div>
            <Field label="Deadline">
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required className={inputCls} />
            </Field>

            {/* Image upload */}
            <Field label="Market image">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-6 transition hover:border-primary/40"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="h-32 w-full rounded-lg object-cover" />
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
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Ranges</label>
              <div className="space-y-2">
                {ranges.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={r.label}
                      onChange={(e) => { const next = [...ranges]; next[i] = { ...next[i], label: e.target.value }; setRanges(next); }}
                      placeholder="Label"
                      className={cn(inputCls, "flex-1")}
                    />
                    <input
                      value={r.minPct}
                      onChange={(e) => { const next = [...ranges]; next[i] = { ...next[i], minPct: e.target.value }; setRanges(next); }}
                      placeholder="Min %"
                      type="number"
                      step="0.01"
                      className={cn(inputCls, "w-20")}
                    />
                    <input
                      value={r.maxPct}
                      onChange={(e) => { const next = [...ranges]; next[i] = { ...next[i], maxPct: e.target.value }; setRanges(next); }}
                      placeholder="Max %"
                      type="number"
                      step="0.01"
                      className={cn(inputCls, "w-20")}
                    />
                    {ranges.length > 2 && (
                      <button type="button" onClick={() => setRanges(ranges.filter((_, j) => j !== i))} className="px-2 text-destructive hover:text-destructive/80 text-lg">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRanges([...ranges, { label: "", minPct: "", maxPct: "" }])}
                className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
              >
                <PlusSignIcon className="h-4 w-4" /> Add range
              </button>
            </div>

            {createMsg && (
              <p className={cn("text-sm font-medium", createMsg.startsWith("✓") ? "text-emerald-600" : "text-destructive")}>
                {createMsg}
              </p>
            )}

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={createLoading}>
              {createLoading ? "Creating…" : "Create market"}
            </Button>
          </form>
        )}

        {/* ── USERS TABLE ── */}
        {tab === "users" && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Username</th>
                        <th className="px-3 py-2">Wallet</th>
                        <th className="px-3 py-2 text-center">Verified</th>
                        <th className="px-3 py-2 text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedProfiles.map((p, i) => (
                        <tr key={p.wallet_address} className="border-t border-border bg-card">
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {(usersPage - 1) * USERS_PER_PAGE + i + 1}
                          </td>
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-medium">@{p.username}</p>
                              {p.email && <p className="text-[11px] text-muted-foreground">{p.email}</p>}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <WalletAddress address={p.wallet_address} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              // @ts-expect-error — is_whitelisted_gd may exist depending on your Supabase types
                              p.is_whitelisted_gd ? "bg-green-500" : "bg-muted-foreground/30"
                            )} title={
                              // @ts-expect-error
                              p.is_whitelisted_gd ? "GD Verified" : "Not verified"
                            } />
                          </td>
                          <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
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
                      Page {usersPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={usersPage === totalPages}
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
      </div>

      {/* ── RESOLVE MODAL ── */}
      {resolving && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Resolve market</h3>
            <p className="mt-1 text-sm text-muted-foreground">{resolving.title}</p>
            <form onSubmit={handleResolve} className="mt-4 space-y-4">
              <Field label="Actual % move (winning value)">
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3.5"
                  value={resolveValue}
                  onChange={(e) => setResolveValue(e.target.value)}
                  required
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setResolving(null); setResolveValue(""); }}>
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

// ── Market list sub-component ────────────────────────────────────────────────
function MarketList({
  markets,
  loading,
  onResolve,
  onUploadImage,
}: {
  markets: Market[];
  loading: boolean;
  onResolve: (m: Market) => void;
  onUploadImage: (id: string) => void;
}) {
  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (markets.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">No active markets. Create one!</p>;

  return (
    <div className="space-y-3">
      {markets.map((m) => (
        <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
          {m.image_url && (
            <img src={m.image_url} alt={m.title} className="mb-3 h-28 w-full rounded-xl object-cover" />
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  active
                </span>
                <span className="text-xs text-muted-foreground">{m.category} · {m.asset}</span>
              </div>
              <p className="mt-1 font-display font-semibold">{m.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deadline: {new Date(m.deadline).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button type="button" size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5" onClick={() => onResolve(m)}>
                Resolve
              </Button>
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
              <span key={r.id} className="rounded-lg border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {r.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatChip({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card px-3 py-3", accent && value > 0 ? "border-amber-300 bg-amber-50/50" : "border-border")}>
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p></div>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", accent && value > 0 ? "text-amber-700" : "")}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30";
