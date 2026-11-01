"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallets } from "@privy-io/react-auth";
import {
  Copy01Icon,
  Setting07Icon,
  Upload01Icon,
  FireIcon,
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
  const [streak, setStreak] = useState<number>(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const setProfile = useAppStore((s) => s.setProfile);

  // Daily streak, extended by claiming G$ or placing a bet (see streak API).
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("current_streak")
      .eq("wallet_address", address.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setStreak((data as { current_streak?: number }).current_streak ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Live on-chain balances
  const addr = address as `0x${string}`;
  const { data: celoBalance } = useBalance({ address: addr });
  const { data: gdBalance } = useReadContract({
    address: G_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addr],
  });

  // Real stats from the subgraph, same query/computation as My Bets, so the
  // numbers shown here can never disagree with the My Bets list below.
  const { data: bets } = useUserStakes(address);
  const { open, closed, winRate, realizedPnl } = computeStakeStats(bets ?? []);
  const stakeStats = { pnl: realizedPnl, open, closed, winRate };

  const short = `${displayAddress.slice(0, 6)}…${displayAddress.slice(-4)}`;
  const initials = (profile?.username ?? "PK").slice(0, 2).toUpperCase();
  const displayName = profile?.username ? `@${profile.username}` : "Player";

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

  const pnl = stakeStats.pnl;
  const pnlTone = pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-foreground";
  const gd = gdBalance != null ? parseFloat(formatUnits(gdBalance as bigint, 18)).toFixed(2) : null;
  const celo = celoBalance ? parseFloat(formatUnits(celoBalance.value, 18)).toFixed(4) : null;

  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-lg px-4 pb-8 pt-5 text-foreground">
      {/* Identity */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="block"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 font-display text-lg font-bold text-brand">
                  {initials}
                </span>
              )}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-foreground text-background"
            >
              <Upload01Icon className="h-3 w-3" />
            </span>
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold tracking-tight">{displayName}</h2>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy wallet address"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {short}
              <Copy01Icon aria-hidden className="h-3 w-3" />
              {copied && <span className="font-sans font-semibold text-brand">Copied</span>}
            </button>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          onClick={() => router.push("/settings")}
          aria-label="Settings"
        >
          <Setting07Icon className="h-4 w-4" />
        </Button>
      </div>

      {/* Performance */}
      <section aria-label="Performance" className="mt-6 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total profit and loss</p>
        <p className={cn("mt-1 font-display text-4xl font-black tabular-nums tracking-tight", pnlTone)}>
          {pnl > 0 ? "+" : ""}
          {pnl.toFixed(2)}
          <span className="ml-1.5 text-lg font-bold text-muted-foreground">G$</span>
        </p>
        <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
          {[
            { label: "Open", value: String(stakeStats.open) },
            { label: "Closed", value: String(stakeStats.closed) },
            { label: "Win rate", value: stakeStats.closed ? `${Math.round(stakeStats.winRate * 100)}%` : "n/a" },
          ].map((s) => (
            <div key={s.label} className="px-2">
              <dd className="font-display text-xl font-bold tabular-nums">{s.value}</dd>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Balances, live from chain */}
      <section aria-label="Wallet balances" className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src="/icons/goodollar.png" alt="" className="h-5 w-5 rounded-full" />
            G$
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{gd ?? "…"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src="/icons/celo.png" alt="" className="h-5 w-5 rounded-full" />
            CELO
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{celo ?? "…"}</p>
        </div>
      </section>

      {/* Stakes */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold">My stakes</h3>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <FireIcon aria-hidden className="h-3.5 w-3.5" />
              {streak}-day streak
            </span>
          )}
        </div>
        <MyBets address={address} onClaimMarket={onClaimMarket} />
      </section>
    </div>
  );
}
