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
}

export function VerificationGate({ onVerified }: Props) {
  const { wallets } = useWallets();
  const address = useAppStore((s) => s.address);
  const setVerified = useAppStore((s) => s.setVerified);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-center px-6 pt-16">
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
