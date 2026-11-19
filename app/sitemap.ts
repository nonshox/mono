import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** One public page — everything else requires sign-in and shouldn't be crawled. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
