"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { celoPublicClient } from "@/lib/gooddollar";
import { buildEmbeddedViemClient } from "@/lib/privy-wallet";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";

interface ClaimState {
  status: "not_whitelisted" | "can_claim" | "already_claimed" | "loading" | "error";
  amount: string;      // formatted G$ (2 dp)
  nextClaimTime: Date | null;
  claiming: boolean;
  error: string | null;
}

function formatCountdown(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function ClaimPage({ compact = false }: { compact?: boolean }) {
  const address = useAppStore((s) => s.address);
  const isVerified = useAppStore((s) => s.isVerified);
  const setVerified = useAppStore((s) => s.setVerified);
  const setHasSkippedVerification = useAppStore((s) => s.setHasSkippedVerification);
  const setClaimBadge = useAppStore((s) => s.setClaimBadge);
  const { wallets } = useWallets();

  const [state, setState] = useState<ClaimState>({
    status: "loading",
    amount: "0.00",
    nextClaimTime: null,
    claiming: false,
    error: null,
  });
  const [countdown, setCountdown] = useState("");

  const buildSDKs = useCallback(async () => {
    // Always use the Privy embedded wallet — GoodDollar links identity to this key
    if (!address || !wallets.length) return null;
    const walletClient = await buildEmbeddedViemClient(wallets, address);

    const { IdentitySDK, ClaimSDK } = await import("@goodsdks/citizen-sdk");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identitySDK = new IdentitySDK({
      publicClient: celoPublicClient,
      walletClient: walletClient as any,
      env: "production",
      account: address as `0x${string}`,
    });
    const claimSDK = new ClaimSDK({
      account: address as `0x${string}`,
      publicClient: celoPublicClient,
      walletClient: walletClient as any,
      identitySDK,
      env: "production",
    });
    return { identitySDK, claimSDK };
  }, [wallets, address]);

  const fetchStatus = useCallback(async () => {
    // Wait until the embedded wallet is available before querying
    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!address || !embeddedWallet) return;
    try {
      const sdks = await buildSDKs();
      if (!sdks) return;
      const { status, entitlement, nextClaimTime } =
        await sdks.claimSDK.getWalletClaimStatus();

      const amountNum = Number(entitlement) / 1e18;
      const canClaim = status === "can_claim";

      setState((prev) => ({
        ...prev,
        status,
        amount: amountNum.toFixed(2),
        nextClaimTime: nextClaimTime ?? null,
        error: null,
      }));
      setClaimBadge(canClaim);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load claim status.",
      }));
    }
  }, [address, wallets, buildSDKs, setClaimBadge]);

  // Poll every 60 seconds
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Countdown ticker
  useEffect(() => {
    if (!state.nextClaimTime || state.status === "can_claim") return;
    const tick = () => {
      setCountdown(formatCountdown(state.nextClaimTime!));
      if (state.nextClaimTime!.getTime() <= Date.now()) fetchStatus();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.nextClaimTime, state.status, fetchStatus]);

  const handleClaim = async () => {
    setState((prev) => ({ ...prev, claiming: true, error: null }));
    try {
      const sdks = await buildSDKs();
      if (!sdks) throw new Error("Wallet not connected");
      await sdks.claimSDK.claim();
      await fetchStatus();
      setState((prev) => ({ ...prev, claiming: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Claim failed. Please try again.",
        claiming: false,
      }));
    }
  };

  const isLoading = state.status === "loading";
  const canClaim = state.status === "can_claim";

  const embeddedReady = wallets.some((w) => w.walletClientType === "privy");

  if (compact) {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      );
    }
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-2 text-5xl font-black font-display text-primary tabular-nums">
          {state.amount}
        </div>
        <p className="text-sm text-muted-foreground font-semibold">G$ available to claim</p>

        {!canClaim && countdown && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">
              Next claim in
            </p>
            <div className="font-display text-3xl font-bold tabular-nums text-foreground">
              {countdown}
            </div>
          </div>
        )}

        {state.status === "not_whitelisted" && (
          <p className="mt-4 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            Your wallet isn&apos;t verified yet. Complete identity verification to start claiming G$.
          </p>
        )}

        {state.error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <Button
          className="mt-8 w-full"
          size="lg"
          disabled={!canClaim || state.claiming}
          onClick={handleClaim}
        >
          {state.claiming ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Claiming…
            </span>
          ) : canClaim ? (
            `Claim ${state.amount} G$`
          ) : (
            "Come back tomorrow"
          )}
        </Button>
      </div>
    );
  }

  // Standalone page: show verification gate if not verified
  if (!isVerified) {
    return (
      <VerificationGate
        onVerified={() => { setVerified(true); setHasSkippedVerification(false); }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-24 text-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {embeddedReady ? "Loading claim status…" : "Waiting for wallet…"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg px-4 pt-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold tracking-tight">Daily G$ Claim</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Universal Basic Income from GoodDollar
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-2 text-5xl font-black font-display text-primary tabular-nums">
          {state.amount}
        </div>
        <p className="text-sm text-muted-foreground font-semibold">G$ available to claim</p>

        {!canClaim && countdown && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">
              Next claim in
            </p>
            <div className="font-display text-3xl font-bold tabular-nums text-foreground">
              {countdown}
            </div>
          </div>
        )}

        {state.status === "not_whitelisted" && (
          <p className="mt-4 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            Your wallet isn&apos;t verified yet. Complete identity verification to start claiming G$.
          </p>
        )}

        {state.error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <Button
          className="mt-8 w-full"
          size="lg"
          disabled={!canClaim || state.claiming}
          onClick={handleClaim}
        >
          {state.claiming ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Claiming…
            </span>
          ) : canClaim ? (
            `Claim ${state.amount} G$`
          ) : (
            "Come back tomorrow"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        G$ is a universal basic income token on the Celo network.{" "}
        <span className="font-semibold text-foreground">Verified humans</span> can claim daily.
      </p>
    </div>
  );
}
