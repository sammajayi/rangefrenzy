"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePrivy, useWallets, useLogin } from "@privy-io/react-auth";
import { DEPLOYER_ADDRESS } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin();
  const [error, setError] = useState("");

  const connectedAddr = wallets[0]?.address?.toLowerCase() as `0x${string}` | undefined;
  const isDeployer = connectedAddr === DEPLOYER_ADDRESS;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!authenticated || !connectedAddr) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="font-display text-xl font-bold">Admin access</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue. Only the deployer address has access.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="mt-2" onClick={() => login()}>
          Sign in
        </Button>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  if (!isDeployer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="font-display text-xl font-bold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          This wallet ({connectedAddr.slice(0, 6)}…{connectedAddr.slice(-4)}) is not the deployer address.
        </p>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  return <AdminClient />;
}
