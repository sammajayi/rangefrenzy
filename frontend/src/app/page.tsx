"use client";

import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useState } from "react";
import type { Profile } from "@/lib/supabase";
import { logoutWeb3Auth } from "@/lib/web3auth-connector";

export default function HomePage() {
  const [phase, setPhase] = useState<"splash" | "auth" | "home">("splash");
  const [address, setAddress] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const handleSplashFinish = () => {
    setPhase("auth");
  };

  const handleAuthenticated = (addr: string, prof: Profile | null) => {
    setAddress(addr);
    setProfile(prof);
    setPhase("home");
  };

  const handleSignOut = async () => {
    try {
      await logoutWeb3Auth();
    } catch {
      // ignore if not logged in via web3auth
    }
    setAddress("");
    setProfile(null);
    setPhase("auth");
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
