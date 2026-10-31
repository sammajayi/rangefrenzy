"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SquareLock01Icon, CancelCircleIcon } from "hugeicons-react";
import { DEPLOYER_ADDRESS } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectedAddr, setConnectedAddr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  // The httpOnly cookie set by /api/admin/session is the only thing that grants access.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAuthed(!!d.authenticated); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
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
      setConnectedAddr(addr);
      // Wrong wallet: skip the signature prompt and show the explanation.
      if (addr !== DEPLOYER_ADDRESS) return;

      // Prove ownership of the deployer key; the server verifies the signature.
      const message = `RangeFrenzy admin sign-in\nAddress: ${addr}\nIssued: ${new Date().toISOString()}`;
      const hex = "0x" + Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("");
      const signature: string = await eth.request({ method: "personal_sign", params: [hex, addr] });
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) {
        setError(res.status === 403 ? "That signature was not accepted." : "Admin sign-in failed. Try again.");
        return;
      }
      setAuthed(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not connect wallet.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setAuthed(false);
    setConnectedAddr(null);
  };

  if (checking) return null;

  if (authed) return <AdminClient />;

  if (!connectedAddr || connectedAddr === DEPLOYER_ADDRESS) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <SquareLock01Icon className="h-7 w-7 text-destructive" />
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <CancelCircleIcon className="h-7 w-7 text-destructive" />
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
