import type { MetadataRoute } from "next";

const BASE_URL = "https://app.rangefrenzy.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
