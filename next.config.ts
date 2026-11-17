import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  compiler: {
    removeConsole: { exclude: ["error"] },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/today", destination: "/check", permanent: true },
      { source: "/checklist", destination: "/check", permanent: true },
      { source: "/api/today", destination: "/api/check", permanent: true },
      { source: "/api/today/:path*", destination: "/api/check/:path*", permanent: true },
      { source: "/api/checklist", destination: "/api/check", permanent: true },
      { source: "/api/checklist/:path*", destination: "/api/check/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
