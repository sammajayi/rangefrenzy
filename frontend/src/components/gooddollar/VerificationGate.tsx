"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { isAddressVerified, generateFVLink } from "@/lib/gooddollar";
import { getEmbeddedWallet, buildEmbeddedViemClient } from "@/lib/privy-wallet";

interface Props {
  onVerified: () => void;
  onSkip: () => void;
}

export function VerificationGate({ onVerified, onSkip }: Props) {
  const { wallets } = useWallets();
  const address = useAppStore((s) => s.address);
  const setVerified = useAppStore((s) => s.setVerified);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // True only when the embedded wallet is ready
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletReady = !!embeddedWallet;

  const markVerified = async () => {
    await supabase
      .from("profiles")
      .update({ is_whitelisted_gd: true })
      .eq("wallet_address", address.toLowerCase());
    setVerified(true);
    onVerified();
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check on-chain first — no wallet needed for a read
      const already = await isAddressVerified(address);
      if (already) {
        await markVerified();
        return;
      }

      // 2. Use the Privy embedded wallet for signing the GoodDollar
      //    identity message — external wallets must not be used here
      const viemWalletClient = await buildEmbeddedViemClient(wallets, address);

      // 3. generateFVLink signs FV_IDENTIFIER_MSG2 with the embedded key
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

  return (
    <div className="fixed inset-0 z-80 flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <span className="font-display text-3xl font-black text-primary">RF</span>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          Verify your identity
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          RangeFrenzy uses GoodDollar to verify you&apos;re a unique human. This is a
          one-time step — you won&apos;t need to do it again.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={handleVerify}
          disabled={loading || !walletReady}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Connecting…
            </span>
          ) : !walletReady ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Preparing wallet…
            </span>
          ) : (
            "Verify Identity"
          )}
        </Button>

        <button
          type="button"
          onClick={onSkip}
          className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline transition-colors"
        >
          Skip for now
        </button>

        <p className="mt-4 text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">GoodDollar</span>.
          {" "}Verification unlocks daily G$ UBI claiming.
        </p>
      </div>
    </div>
  );
}
