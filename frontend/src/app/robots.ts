import type { MetadataRoute } from "next";

const BASE_URL = "https://app.rangefrenzy.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // User-specific / privileged areas — no value in indexing.
      disallow: ["/settings", "/admin"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
