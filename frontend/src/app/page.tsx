"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { useAppStore } from "@/lib/store";
import { useLogout } from "@privy-io/react-auth";
import { supabase } from "@/lib/supabase";
import { isAddressVerified } from "@/lib/gooddollar";
// import { Navbar } from "@/components/navbar";

function HomeInner() {
  const phase = useAppStore((s) => s.phase);
  const address = useAppStore((s) => s.address);
  const profile = useAppStore((s) => s.profile);
  const isVerified = useAppStore((s) => s.isVerified);
  const hasSkippedVerification = useAppStore((s) => s.hasSkippedVerification);
  const setPhase = useAppStore((s) => s.setPhase);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setVerified = useAppStore((s) => s.setVerified);
  const setHasSkippedVerification = useAppStore((s) => s.setHasSkippedVerification);
  const setRole = useAppStore((s) => s.setRole);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const signOut = useAppStore((s) => s.signOut);
  const { logout } = useLogout();
  const searchParams = useSearchParams();

  // Handle GoodDollar verification callback (?gd_verified=true)
  useEffect(() => {
    if (searchParams.get("gd_verified") !== "true") return;
    if (!address || isVerified) return;

    const confirm = async () => {
      try {
        const verified = await isAddressVerified(address);
        if (verified) {
          await supabase
            .from("profiles")
            .update({ is_whitelisted_gd: true })
            .eq("wallet_address", address.toLowerCase());
          setVerified(true);
          setPhase("home");
        }
      } catch {
        // ignore
      }
    };
    confirm();
    window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams, address, isVerified, setVerified, setPhase]);

  // After auth: go straight to home; show verify gate as overlay only if
  // user hasn't verified AND hasn't skipped yet this session
  useEffect(() => {
    if (phase !== "home" && phase !== "verify") return;
    if (isVerified || hasSkippedVerification) {
      setPhase("home");
      return;
    }
    if (address) setPhase("verify");
  }, [phase, isVerified, hasSkippedVerification, address, setPhase]);

  const handleSplashFinish = () => setPhase("auth");

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    signOut();
  };

  // Sync profile fields into store on login
  const handleAuthenticated = (addr: string, profile: import("@/lib/supabase").Profile | null) => {
    setAuthenticated(addr, profile);
    if (profile) {
      if (profile.is_whitelisted_gd) setVerified(true);
      if (profile.has_seen_onboarding) setHasSeenOnboarding(true);
      if (profile.role) setRole(profile.role as "user" | "admin");
    }
  };

  const handleVerified = () => {
    setVerified(true);
    setPhase("home");
  };

  const handleSkip = () => {
    setHasSkippedVerification(true);
    setPhase("home");
  };

  return (
    <>
      {/* Navbar only shown when the app shell is active */}
      {/* {phase === "home" && <Navbar />} */}

      {phase === "splash" && <SplashScreen onFinish={handleSplashFinish} />}
      {phase === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
      {phase === "verify" && (
        <VerificationGate onVerified={handleVerified} onSkip={handleSkip} />
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
