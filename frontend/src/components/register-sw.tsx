"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    // The SW caches every GET request. In dev, Turbopack's chunk hashes change
    // on every edit, so a stale cached response no longer matches what the dev
    // server expects — the client reloads, the SW re-serves the same stale
    // cache, and the page never gets past that reload. Production-only.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return <> </>;
}
