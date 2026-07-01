"use client";

import { Suspense, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useAppStore } from "@/lib/store";
import { usePrivy, useLogout, useWallets } from "@privy-io/react-auth";
import { supabase, sendNotification } from "@/lib/supabase";
import { isAddressVerified, generateFVLink } from "@/lib/gooddollar";
import { buildEmbeddedViemClient } from "@/lib/privy-wallet";
import { Copy01Icon, Setting07Icon, Logout01Icon, Upload01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

function HomeInner() {
  const phase = useAppStore((s) => s.phase);
  const address = useAppStore((s) => s.address);
  const profile = useAppStore((s) => s.profile);
  const isVerified = useAppStore((s) => s.isVerified);
  const setPhase = useAppStore((s) => s.setPhase);
  const setAddress = useAppStore((s) => s.setAddress);
  const setProfile = useAppStore((s) => s.setProfile);
  const setVerified = useAppStore((s) => s.setVerified);
  const setRole = useAppStore((s) => s.setRole);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const setPendingTab = useAppStore((s) => s.setPendingTab);
  const signOut = useAppStore((s) => s.signOut);
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { logout } = useLogout();
  const searchParams = useSearchParams();
  const isGdCallback = searchParams.get("gd_verified") === "true";
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check on-chain first, then update Supabase + store.
  // Returns true if whitelisted.
  const syncVerification = useCallback(async (addr: string): Promise<boolean> => {
    try {
      const verified = await isAddressVerified(addr);
      if (verified) {
        await supabase
          .from("profiles")
          .update({ is_whitelisted_gd: true })
          .eq("wallet_address", addr.toLowerCase());
        setVerified(true);
      }
      return verified;
    } catch {
      return false;
    }
  }, [setVerified]);

  // Handle GoodDollar verification callback (?gd_verified=true)
  // Skips splash, checks on-chain in background.
  useEffect(() => {
    if (!isGdCallback) return;
    if (!address || isVerified) return;

    setPendingTab("earn");
    setPhase("home");
    syncVerification(address);
    window.history.replaceState({}, "", window.location.pathname);
  }, [isGdCallback, address, isVerified, setPhase, setPendingTab, syncVerification]);

  // Skip auth page when returning user has a valid session.
  // Also verify on-chain status before routing — unwhitelisted → verify phase.
  const handleSplashFinish = async () => {
    // `authenticated` is intentionally omitted: Privy auto-restores embedded
    // wallet sessions but never auto-reconnects external wallets (WalletConnect,
    // MetaMask) on refresh. Checking it would reset connect-wallet users to the
    // auth screen on every page reload. Stored address + profile are sufficient.
    if (address && profile && ready) {
      const verified = await syncVerification(address);
      setPhase(verified ? "home" : "verify");
    } else {
      setPhase("auth");
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    signOut();
  };

  // On login/signup: check whitelist before routing.
  // Not whitelisted → verify phase (wallet card). Whitelisted → home.
  const handleAuthenticated = async (addr: string, p: import("@/lib/supabase").Profile | null) => {
    setAddress(addr);
    setProfile(p);

    if (p) {
      if (p.has_seen_onboarding) setHasSeenOnboarding(true);
      if (p.role) setRole(p.role as "user" | "admin");

      const verified = await syncVerification(addr);
      if (verified) {
        setPhase("home");
      } else {
        setPhase("verify");
        // Auto-notification for unverified users (one-time)
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("username", p.username.toLowerCase())
          .eq("title", "Verify on GoodDollar")
          .maybeSingle();
        if (!existing) {
          await sendNotification(
            p.username,
            "Verify on GoodDollar",
            "earn daily g$, get rewarded",
          );
        }
      }
    } else {
      setPhase("home");
    }
  };

  // Catch-all: sync on-chain verification state on every app load.
  useEffect(() => {
    if (!address || isVerified) return;
    syncVerification(address);
  }, [address, isVerified, syncVerification]);

  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const already = await isAddressVerified(address);
      if (already) {
        setVerified(true);
        setPhase("home");
        return;
      }
      const viemWalletClient = await buildEmbeddedViemClient(wallets, address);
      const callbackUrl = `${window.location.origin}?gd_verified=true`;
      const link = await generateFVLink(viemWalletClient, callbackUrl);
      window.location.href = link;
    } catch {
      setVerifyLoading(false);
    }
  };

  const handleCopyAddress = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {phase === "splash" && !isGdCallback && <SplashScreen onFinish={handleSplashFinish} />}
      {phase === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
      {phase === "verify" && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-background p-6">
          {/* Top bar: logo left, settings right */}
          <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3">
            <Logo size={36} />
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full border-border"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Settings"
              >
                <Setting07Icon className="h-4 w-4" />
              </Button>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-100" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 top-11 z-110 min-w-45 rounded-2xl border border-border bg-card p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setShowSettings(false); handleCopyAddress(); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent transition"
                    >
                      <Copy01Icon className="h-4 w-4" />
                      {copied ? "Copied!" : "Copy wallet address"}
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      onClick={() => { setShowSettings(false); handleSignOut(); }}
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

          <div className="w-full max-w-sm">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-xs text-muted-foreground">
                Copy your wallet address to receive $CELO from the admin, then proceed to verify your identity.
              </p>

              <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3">
                <code className="flex-1 truncate text-sm font-mono">{address}</code>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className={cn(
                    "flex h-8 cursor-pointer w-8 items-center justify-center rounded-lg transition shrink-0",
                    copied
                      ? "text-[#07955F]"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                  aria-label="Copy wallet address"
                >
                  <Copy01Icon className="h-4 w-4" />
                </button>
              </div>
              {copied && (
                <p className="mt-1.5 text-xs text-[#07955F]">Copied!</p>
              )}

              <Button
                className="mt-5 w-full rounded-xl bg-[#07955F] text-base font-semibold text-white hover:bg-[#068050]"
                size="lg"
                onClick={() => window.open("https://t.me/+Vz9Ze9dNIww0OGY0", "_blank")}
              >
                Get Gas
              </Button>

              <Button
                type="button"
                className="mt-4 w-full rounded-xl"
                size="lg"
                variant="outline"
                onClick={handleVerify}
                disabled={verifyLoading}
              >
                {verifyLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
                    Connecting…
                  </span>
                ) : (
                  "Verify Identity"
                )}
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Verify your identity to start staking on outcome ranges
            </p>
          </div>
        </div>
      )}
      {phase === "home" && (
        <RangeFrenzyHome
          address={address}
          profile={profile}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
