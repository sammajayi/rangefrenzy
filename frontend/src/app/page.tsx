"use client";

import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { RangeFrenzyHome } from "@/components/pickoo-minipay-home";
import { useAppStore } from "@/lib/store";
import { useWeb3AuthDisconnect } from "@web3auth/modal/react";

export default function HomePage() {
  const phase = useAppStore((s) => s.phase);
  const address = useAppStore((s) => s.address);
  const profile = useAppStore((s) => s.profile);
  const setPhase = useAppStore((s) => s.setPhase);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const signOut = useAppStore((s) => s.signOut);
  const { disconnect } = useWeb3AuthDisconnect();

  const handleSplashFinish = () => {
    setPhase("auth");
  };

  const handleSignOut = async () => {
    try {
      await disconnect();
    } catch {
      // ignore
    }
    signOut();
  };

  return (
    <>
      {phase === "splash" && <SplashScreen onFinish={handleSplashFinish} />}
      {phase === "auth" && <AuthPage onAuthenticated={setAuthenticated} />}
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
