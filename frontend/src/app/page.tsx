"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { SplashScreen } from "@/components/splash-screen";
import { AuthPage } from "@/components/auth-page";
import { PickooMinipayHome } from "@/components/pickoo-minipay-home";

export default function Home() {
  const { isConnected } = useAccount();
  const [phase, setPhase] = useState<"splash" | "auth" | "home">("splash");

  const handleSplashFinish = () => {
    setPhase(isConnected ? "home" : "auth");
  };

  const handleAuthenticated = () => {
    setPhase("home");
  };

  return (
    <>
      {phase === "splash" && <SplashScreen onFinish={handleSplashFinish} />}
      {phase === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
      {phase === "home" && <PickooMinipayHome />}
    </>
  );
}
