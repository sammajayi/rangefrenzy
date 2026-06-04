"use client";

import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useState } from "react";
import type { Profile } from "@/lib/supabase";
import { useWeb3AuthDisconnect } from "@web3auth/modal/react";

export default function HomePage() {
  const [phase, setPhase] = useState<"splash" | "auth" | "home">("splash");
  const [address, setAddress] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const { disconnect } = useWeb3AuthDisconnect();

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
      await disconnect();
    } catch {
      // ignore
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
