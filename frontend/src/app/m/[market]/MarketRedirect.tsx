"use client";

import { useEffect } from "react";

/**
 * Bounces a human visitor into the app on the shared market immediately.
 * Crawlers don't run this, so they still read the server-rendered
 * metadata/OG tags on the page.
 */
export function MarketRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return null;
}
