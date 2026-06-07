"use client";

import { useState, useRef, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Copy01Icon, Logout01Icon, Setting07Icon, Upload01Icon, CheckmarkCircle01Icon, UserCheck01Icon } from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile, Stake } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { MyBets } from "@/components/MyBets";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
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

  // Real stats from stakes table
  const [stakeStats, setStakeStats] = useState({ pnl: 0, open: 0, closed: 0, winRate: 0 });
  useEffect(() => {
    if (!address) return;
    supabase
      .from("stakes")
      .select("status, amount_gd, payout_gd")
      .eq("wallet_address", address.toLowerCase())
      .then(({ data }) => {
        if (!data?.length) return;
        const stakes = data as Pick<Stake, "status" | "amount_gd" | "payout_gd">[];
        const closed = stakes.filter((s) => s.status !== "open");
        const wins = stakes.filter((s) => s.status === "won");
        const totalStaked = stakes.reduce((acc, s) => acc + parseFloat(s.amount_gd ?? "0"), 0);
        const totalPayout = wins.reduce((acc, s) => acc + parseFloat(s.payout_gd ?? "0"), 0);
        setStakeStats({
          pnl: totalPayout - totalStaked,
          open: stakes.filter((s) => s.status === "open").length,
          closed: closed.length,
          winRate: closed.length ? wins.length / closed.length : 0,
        });
      });
  }, [address]);

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

  const copy = () => {
    void navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Total P&L", value: `${stakeStats.pnl >= 0 ? "+" : ""}${stakeStats.pnl.toFixed(2)} G$` },
    { label: "Open", value: String(stakeStats.open) },
    { label: "Closed", value: String(stakeStats.closed) },
    { label: "Win rate", value: stakeStats.closed ? `${Math.round(stakeStats.winRate * 100)}%` : "—" },
  ];

  return (
    <div className="min-h-[calc(100dvh-8rem)] rounded-t-3xl bg-white pb-8 pt-1 text-foreground shadow-sm ring-1 ring-border relative">
      <div className="px-4 pt-3">
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
                  <img src={profile.avatar_url} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
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
              className="h-9 w-9 shrink-0 rounded-full border-border"
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
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-base font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Wallet balances — live from chain */}
        <section className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Wallet balances</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <img src="/icons/celo.png" alt="CELO" className="h-4 w-4 rounded-full shrink-0" />
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">CELO</span>
              <span className="text-xs font-bold tabular-nums">{celoBalance ? parseFloat(formatUnits(celoBalance.value, 18)).toFixed(4) : "—"}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <img src="/icons/goodollar.png" alt="G$" className="h-4 w-4 rounded-full shrink-0" />
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">G$</span>
              <span className="text-xs font-bold tabular-nums">{gdBalance != null ? parseFloat(formatUnits(gdBalance as bigint, 18)).toFixed(2) : "—"}</span>
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
    </div>
  );
}
