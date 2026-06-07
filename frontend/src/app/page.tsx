"use client";

import { Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useAppStore } from "@/lib/store";
import { usePrivy, useLogout } from "@privy-io/react-auth";
import { supabase } from "@/lib/supabase";
import { isAddressVerified } from "@/lib/gooddollar";

function HomeInner() {
  const phase = useAppStore((s) => s.phase);
  const address = useAppStore((s) => s.address);
  const profile = useAppStore((s) => s.profile);
  const isVerified = useAppStore((s) => s.isVerified);
  const setPhase = useAppStore((s) => s.setPhase);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setVerified = useAppStore((s) => s.setVerified);
  const setRole = useAppStore((s) => s.setRole);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const setPendingTab = useAppStore((s) => s.setPendingTab);
  const signOut = useAppStore((s) => s.signOut);
  const { ready, authenticated } = usePrivy();
  const { logout } = useLogout();
  const searchParams = useSearchParams();
  const isGdCallback = searchParams.get("gd_verified") === "true";

  // Check on-chain first, then update Supabase + store.
  const syncVerification = useCallback(async (addr: string) => {
    try {
      const verified = await isAddressVerified(addr);
      if (verified) {
        await supabase
          .from("profiles")
          .update({ is_whitelisted_gd: true })
          .eq("wallet_address", addr.toLowerCase());
        setVerified(true);
      }
    } catch {
      // on-chain read failure — stay unverified until next check
    }
  }, [setVerified]);

  // Handle GoodDollar verification callback (?gd_verified=true)
  // Skips splash, redirects to Earn tab, checks on-chain in background.
  useEffect(() => {
    if (!isGdCallback) return;
    if (!address || isVerified) return;

    setPendingTab("earn");
    setPhase("home");
    syncVerification(address);
    window.history.replaceState({}, "", window.location.pathname);
  }, [isGdCallback, address, isVerified, setPhase, setPendingTab, syncVerification]);

  // Skip auth page when returning user has a valid session
  const handleSplashFinish = () => {
    if (address && profile && ready && authenticated) {
      setPhase("home");
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

  // Sync profile into store on login.
  // On-chain verification is checked separately (never trust DB flag).
  const handleAuthenticated = (addr: string, profile: import("@/lib/supabase").Profile | null) => {
    setAuthenticated(addr, profile);
    if (profile) {
      syncVerification(addr);
      if (profile.has_seen_onboarding) setHasSeenOnboarding(true);
      if (profile.role) setRole(profile.role as "user" | "admin");
    }
  };

  // Catch-all: sync on-chain verification state on every app load.
  useEffect(() => {
    if (!address || isVerified) return;
    syncVerification(address);
  }, [address, isVerified, syncVerification]);

  return (
    <>
      {phase === "splash" && !isGdCallback && <SplashScreen onFinish={handleSplashFinish} />}
      {phase === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
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
