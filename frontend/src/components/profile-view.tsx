"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallets } from "@privy-io/react-auth";
import {
  Copy01Icon,
  Setting07Icon,
  Upload01Icon,
  CheckmarkCircle01Icon,
  ChartUpIcon,
  Clock01Icon,
  Target01Icon,
  Wallet01Icon,
} from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { MyBets } from "@/components/MyBets";
import { useUserStakes } from "@/lib/hooks/use-user-stakes";
import { computeStakeStats } from "@/lib/stake-stats";
import { useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { G_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/contracts";

interface Props {
  address: string;
  profile: Profile | null;
  onClaimMarket?: (marketAddress: string) => void;
}

export function ProfileView({ address, profile, onClaimMarket }: Props) {
  const router = useRouter();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const displayAddress = embeddedWallet?.address ?? address;

  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-border bg-white shadow-sm"
            onClick={() => router.push("/settings")}
            aria-label="Settings"
          >
            <Setting07Icon className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 rounded-2xl border border-border bg-card divide-x divide-border shadow-sm">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1 px-1.5 py-2.5 text-center">
                <div className={cn("flex h-5 w-5 items-center justify-center rounded-md", s.tint)}>
                  <Icon className="h-3 w-3" />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("font-display text-xs font-bold tabular-nums", s.valueClass)}>{s.value}</p>
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
          <MyBets address={address} onClaimMarket={onClaimMarket} />
        </section>
      </div>
    </div>
  );
}
