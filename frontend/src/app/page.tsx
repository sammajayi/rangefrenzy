"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useAppStore } from "@/lib/store";
import { useLogout } from "@privy-io/react-auth";
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

  return (
    <>
      {phase === "splash" && <SplashScreen onFinish={handleSplashFinish} />}
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
