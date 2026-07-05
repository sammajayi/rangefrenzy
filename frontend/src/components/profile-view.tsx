"use client";

import { useState, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  Copy01Icon,
  Logout01Icon,
  Setting07Icon,
  Upload01Icon,
  CheckmarkCircle01Icon,
  UserCheck01Icon,
  ChartUpIcon,
  Clock01Icon,
  Target01Icon,
  Wallet01Icon,
  PencilEdit01Icon,
} from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { MyBets } from "@/components/MyBets";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { useUserStakes } from "@/lib/hooks/use-user-stakes";
import { computeStakeStats } from "@/lib/stake-stats";
import { useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { G_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/contracts";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

export function ProfileView({ address, profile, onSignOut }: Props) {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const displayAddress = embeddedWallet?.address ?? address;

  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isVerified, setIsVerified] = useState(!!profile?.is_whitelisted_gd);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const setProfile = useAppStore((s) => s.setProfile);

  // Live on-chain balances
  const addr = address as `0x${string}`;
  const { data: celoBalance } = useBalance({ address: addr });
  const { data: gdBalance } = useReadContract({
    address: G_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addr],
  });

  // Real stats from the subgraph — same query/computation as My Bets, so the
  // numbers shown here can never disagree with the My Bets list below.
  const { data: bets } = useUserStakes(address);
  const { open, closed, winRate, realizedPnl } = computeStakeStats(bets ?? []);
  const stakeStats = { pnl: realizedPnl, open, closed, winRate };

  const short = `${displayAddress.slice(0, 6)}…${displayAddress.slice(-4)}`;
  const initials = (profile?.username ?? "PK").slice(0, 2).toUpperCase();
  const displayName = profile?.username
    ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1)
    : "Player";
  const handle = profile?.username ? `@${profile.username}` : "@player";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(address, file);
      if (profile) {
        await supabase.from("profiles").update({ avatar_url: url }).eq("wallet_address", address.toLowerCase());
        setProfile({ ...profile, avatar_url: url });
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const openUsernameEdit = () => {
    setNewUsername(profile?.username ?? "");
    setUsernameError("");
    setShowSettings(false);
    setShowUsernameEdit(true);
  };

  const saveUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed.length < 3 || trimmed.length > 30) {
      setUsernameError("Username must be 3–30 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, and underscores allowed.");
      return;
    }
    setUsernameSaving(true);
    setUsernameError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("wallet_address", address.toLowerCase());
      if (error) {
        if (error.code === "23505") setUsernameError("That username is already taken.");
        else setUsernameError("Failed to update username. Please try again.");
        return;
      }
      if (profile) setProfile({ ...profile, username: trimmed });
      setShowUsernameEdit(false);
    } finally {
      setUsernameSaving(false);
    }
  };

  const copy = () => {
    void navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pnlPositive = stakeStats.pnl >= 0;
  const stats = [
    {
      label: "Total P&L",
      value: `${pnlPositive ? "+" : ""}${stakeStats.pnl.toFixed(2)} G$`,
      icon: ChartUpIcon,
      tint: pnlPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
      valueClass: pnlPositive ? "text-emerald-600" : "text-red-600",
    },
    {
      label: "Open",
      value: String(stakeStats.open),
      icon: Clock01Icon,
      tint: "bg-blue-50 text-blue-600",
      valueClass: "",
    },
    {
      label: "Closed",
      value: String(stakeStats.closed),
      icon: CheckmarkCircle01Icon,
      tint: "bg-muted text-muted-foreground",
      valueClass: "",
    },
    {
      label: "Win rate",
      value: stakeStats.closed ? `${Math.round(stakeStats.winRate * 100)}%` : "—",
      icon: Target01Icon,
      tint: "bg-amber-50 text-amber-600",
      valueClass: "",
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-8rem)] rounded-t-3xl bg-white pb-8 pt-5 text-foreground shadow-sm ring-1 ring-border relative overflow-hidden">
      <div className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-16 w-16 rounded-full object-cover ring-4 ring-primary/10 shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary ring-4 ring-primary/10 shadow-sm">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Upload01Icon className="h-5 w-5 text-white" />
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{handle}</p>
              <button
                type="button"
                onClick={copy}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {short}
                <Copy01Icon className="h-3 w-3" />
                {copied && <span className="text-primary">Copied</span>}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-border bg-white shadow-sm"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Profile settings"
            >
              <Setting07Icon className="h-4 w-4" />
            </Button>

            {showSettings && (
              <>
                <div className="fixed inset-0 z-[80]" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-11 z-[90] min-w-[180px] rounded-2xl border border-border bg-card p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); avatarInputRef.current?.click(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent transition"
                  >
                    <Upload01Icon className="h-4 w-4" />
                    Change avatar
                  </button>

                  <button
                    type="button"
                    onClick={openUsernameEdit}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent transition"
                  >
                    <PencilEdit01Icon className="h-4 w-4" />
                    Change username
                  </button>

                  {/* GoodDollar verification — show if not yet verified */}
                  {isVerified ? (
                    <div className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[#07955F]">
                      <CheckmarkCircle01Icon className="h-4 w-4" />
                      GD Verified
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowSettings(false); setShowVerification(true); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent transition"
                    >
                      <UserCheck01Icon className="h-4 w-4" />
                      Verify with GoodDollar
                    </button>
                  )}

                  <div className="my-1 h-px bg-border" />

                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); onSignOut(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
                  >
                    <Logout01Icon className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", s.tint)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("mt-0.5 font-display text-base font-bold tabular-nums", s.valueClass)}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Wallet balances — live from chain */}
        <section className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Wallet01Icon className="h-3.5 w-3.5" />
            Wallet balances
          </h3>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent px-4 py-3">
            <div className="flex items-center gap-2 shrink-0">
              <img src="/icons/celo.png" alt="CELO" className="h-5 w-5 rounded-full shrink-0 shadow-sm" />
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">CELO</span>
              <span className="text-sm font-bold tabular-nums">{celoBalance ? parseFloat(formatUnits(celoBalance.value, 18)).toFixed(4) : "—"}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <img src="/icons/goodollar.png" alt="G$" className="h-5 w-5 rounded-full shrink-0 shadow-sm" />
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">G$</span>
              <span className="text-sm font-bold tabular-nums">{gdBalance != null ? parseFloat(formatUnits(gdBalance as bigint, 18)).toFixed(2) : "—"}</span>
            </div>
          </div>
        </section>

        {/* My Bets */}
        <section className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">My Bets</h3>
          <MyBets address={address} />
        </section>
      </div>
      {/* GoodDollar verification overlay */}
      {showVerification && (
        <VerificationGate
          onVerified={() => {
            setIsVerified(true);
            setShowVerification(false);
          }}
        />
      )}

      {/* Username edit modal */}
      {showUsernameEdit && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowUsernameEdit(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold mb-1">Change username</h3>
            <p className="text-sm text-muted-foreground mb-4">3–30 chars, letters, numbers, and underscores only.</p>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => { setNewUsername(e.target.value); setUsernameError(""); }}
              placeholder="new_username"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50"
            />
            {usernameError && <p className="mt-2 text-xs text-destructive">{usernameError}</p>}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowUsernameEdit(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={saveUsername}
                disabled={usernameSaving}
              >
                {usernameSaving ? "Updating…" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
