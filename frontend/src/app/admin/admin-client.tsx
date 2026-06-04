"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Market, Profile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusSignIcon, CheckmarkCircle01Icon, User02Icon, Chart01Icon } from "hugeicons-react";
import { Link } from "wouter";

type AdminTab = "markets" | "create" | "users";

type RangeInput = { label: string; minPct: string; maxPct: string };

const defaultRanges: RangeInput[] = [
  { label: "0% – 2%", minPct: "0", maxPct: "2" },
  { label: "2% – 5%", minPct: "2", maxPct: "5" },
  { label: "5% – 10%", minPct: "5", maxPct: "10" },
  { label: "Above 10%", minPct: "10", maxPct: "" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("markets");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    title: "",
    asset: "",
    category: "Crypto",
    window_label: "",
    volume_label: "$0 staked",
    deadline: "",
    image_url: "",
  });
  const [ranges, setRanges] = useState<RangeInput[]>(defaultRanges);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Resolve modal
  const [resolving, setResolving] = useState<Market | null>(null);
  const [resolveValue, setResolveValue] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab]);

  async function fetchData() {
    setLoading(true);
    if (tab === "markets" || tab === "create") {
      const { data } = await supabase.from("markets").select("*").order("created_at", { ascending: false });
      if (data) setMarkets(data as Market[]);
    }
    if (tab === "users") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (data) setProfiles(data as Profile[]);
    }
    setLoading(false);
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

      const { error } = await supabase.from("markets").insert({
        title: form.title,
        asset: form.asset,
        category: form.category,
        window_label: form.window_label,
        volume_label: form.volume_label,
        deadline: new Date(form.deadline).toISOString(),
        image_url: form.image_url || null,
        ranges: parsedRanges,
        status: "active",
      });

      if (error) throw error;
      setCreateMsg("✓ Market created successfully!");
      setForm({ title: "", asset: "", category: "Crypto", window_label: "", volume_label: "$0 staked", deadline: "", image_url: "" });
      setRanges(defaultRanges);
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
      const { error } = await supabase
        .from("markets")
        .update({ status: "resolved", winning_value: parseFloat(resolveValue) })
        .eq("id", resolving.id);
      if (error) throw error;
      setResolving(null);
      setResolveValue("");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setResolveLoading(false);
    }
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "markets", label: "Markets" },
    { id: "create", label: "Create" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatChip label="Active markets" value={markets.filter((m) => m.status === "active").length} icon={<Chart01Icon className="h-4 w-4" />} />
          <StatChip label="Total markets" value={markets.length} icon={<CheckmarkCircle01Icon className="h-4 w-4" />} />
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
                "flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MARKETS LIST ── */}
        {tab === "markets" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : markets.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No markets yet. Create one!</p>
            ) : (
              markets.map((m) => (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          m.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground",
                        )}>
                          {m.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.category} · {m.asset}</span>
                      </div>
                      <p className="mt-1 font-display font-semibold">{m.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Deadline: {new Date(m.deadline).toLocaleString()}
                      </p>
                      {m.status === "resolved" && m.winning_value !== null && (
                        <p className="mt-0.5 text-xs font-medium text-emerald-700">
                          Resolved at: {m.winning_value}%
                        </p>
                      )}
                    </div>
                    {m.status === "active" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setResolving(m)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.ranges.map((r) => (
                      <span key={r.id} className="rounded-lg border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))
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
                  {["Crypto", "Sports", "Weather", "Stocks"].map((c) => <option key={c}>{c}</option>)}
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
            <Field label="Image URL (optional)">
              <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className={inputCls} />
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
                      <button type="button" onClick={() => setRanges(ranges.filter((_, j) => j !== i))} className="px-2 text-destructive hover:text-destructive/80">×</button>
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
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Wallet</th>
                      <th className="px-3 py-2 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.wallet_address} className="border-t border-border bg-card">
                        <td className="px-3 py-3 font-medium">@{p.username}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {p.email ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {p.wallet_address.slice(0, 6)}…{p.wallet_address.slice(-4)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  {resolveLoading ? "Resolving…" : "Confirm"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p></div>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
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
