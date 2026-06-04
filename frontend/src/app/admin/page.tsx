"use client";
import dynamic from "next/dynamic";

// Admin page uses wouter (reads window.location) — must be client-only, no SSR
const AdminClient = dynamic(() => import("./admin-client"), { ssr: false });

export default function AdminPage() {
  return <AdminClient />;
}
