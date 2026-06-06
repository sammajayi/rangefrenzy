"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");

  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === adminPassword) {
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="font-display text-xl font-bold">Admin access</h1>
        <p className="text-sm text-muted-foreground">
          Enter the admin password to continue.
        </p>
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30 text-center"
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={!password}>
            Enter
          </Button>
        </form>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  return <AdminClient />;
}
