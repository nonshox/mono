import type { MetadataRoute } from "next";

/** The app itself stays out of search; only the public landing page is crawlable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/about", "/llms.txt", "/logotype/", "/favicon.ico"],
        disallow: "/",
      },
    ],
  };
}
