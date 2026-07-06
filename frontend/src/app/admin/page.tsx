"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { DEPLOYER_ADDRESS } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  const [connectedAddr, setConnectedAddr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Restore previously connected address from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("admin-wallet");
    if (saved) setConnectedAddr(saved);
  }, []);

  const connect = async () => {
    setError("");
    setConnecting(true);
    try {
      const eth = (window as any).ethereum;
      if (!eth) {
        setError("No wallet detected. Please install MetaMask or use a web3 browser.");
        return;
      }
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const addr = accounts[0]?.toLowerCase();
      if (!addr) { setError("No account returned."); return; }
      sessionStorage.setItem("admin-wallet", addr);
      setConnectedAddr(addr);
    } catch (e: any) {
      setError(e?.message ?? "Could not connect wallet.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    sessionStorage.removeItem("admin-wallet");
    setConnectedAddr(null);
  };

  if (!connectedAddr) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="font-display text-xl font-bold">Admin access</h1>
        <p className="text-sm text-muted-foreground">
          Connect the deployer wallet to continue.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="mt-2" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  if (connectedAddr !== DEPLOYER_ADDRESS) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="font-display text-xl font-bold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          {connectedAddr.slice(0, 6)}…{connectedAddr.slice(-4)} is not the deployer address.
        </p>
        <Button variant="outline" onClick={disconnect}>Try a different wallet</Button>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  return <AdminClient />;
}
