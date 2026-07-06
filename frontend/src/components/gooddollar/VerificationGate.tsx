"use client";

import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { ShieldUserIcon, Alert01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { supabase, sendNotification } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { isAddressVerified, generateFVLink } from "@/lib/gooddollar";
import { buildEmbeddedViemClient } from "@/lib/privy-wallet";

interface Props {
  onVerified: () => void;
}

export function VerificationGate({ onVerified }: Props) {
  const { wallets } = useWallets();
  const address = useAppStore((s) => s.address);
  const setVerified = useAppStore((s) => s.setVerified);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const markVerified = async () => {
    await supabase
      .from("profiles")
      .update({ is_whitelisted_gd: true })
      .eq("wallet_address", address.toLowerCase());
    setVerified(true);
    onVerified();
    const p = useAppStore.getState().profile;
    if (p?.username) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("username", p.username.toLowerCase())
        .eq("title", "Welcome")
        .maybeSingle();
      if (!existing) {
        await sendNotification(p.username, "Welcome", "Earn Daily G$, 10x it with RangeFrenzy");
      }
    }
  };

  // Auto-check on mount: if wallet is already whitelisted on-chain, skip gate.
  // Retries up to 5 times to account for on-chain propagation delay after FV.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const check = async (attempt: number) => {
      try {
        const already = await isAddressVerified(address);
        if (already && !cancelled) {
          await markVerified();
          return;
        }
        if (attempt < 5 && !cancelled) {
          setTimeout(() => check(attempt + 1), 2000);
        } else if (!cancelled) {
          setChecking(false);
        }
      } catch {
        if (attempt < 5 && !cancelled) {
          setTimeout(() => check(attempt + 1), 2000);
        } else if (!cancelled) {
          setChecking(false);
        }
      }
    };
    check(0);
    return () => { cancelled = true; };
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const already = await isAddressVerified(address);
      if (already) {
        await markVerified();
        return;
      }

      const viemWalletClient = await buildEmbeddedViemClient(wallets, address);
      const callbackUrl = `${window.location.origin}?gd_verified=true`;
      const link = await generateFVLink(viemWalletClient, callbackUrl);
      window.location.href = link;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed. Please try again."
      );
      setLoading(false);
    }
  };

  // While auto-checking on-chain, show a minimal loading state
  if (checking) {
    return (
      <div className="flex flex-col items-center px-6 pt-16">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pt-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <ShieldUserIcon className="h-10 w-10" />
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          Verify your identity
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          RangeFrenzy is a range-based prediction market on Celo.
          Stake G$ on outcome ranges for crypto, sports, weather and more.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Alert01Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Connecting…
            </span>
          ) : (
            "Verify Identity"
          )}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">GoodDollar</span>.
          {" "}Verification unlocks daily G$ UBI claiming.
        </p>
      </div>
    </div>
  );
}
