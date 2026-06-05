"use client";

import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";

const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  const role = useAppStore((s) => s.role);
  const phase = useAppStore((s) => s.phase);

  // Block unauthenticated or non-admin users
  if (phase !== "home" || role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="font-display text-xl font-bold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          This page is restricted to administrators.
        </p>
        <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  return <AdminClient />;
}
