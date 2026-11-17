import { AuthExperience } from "@/components/interface/auth-experience";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Mono with an emailed six-digit code. No password.",
};

const siteUrl = getSiteUrl();

// The only public page. Factual, minimal schema — the app is private
// everywhere else; the root default keeps /auth out of search indexes.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Mono",
      description: "A slow, private journal.",
      url: siteUrl,
    },
    {
      "@type": "WebApplication",
      name: "Mono",
      description: "A slow, private journal.",
      url: siteUrl,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript.",
    },
  ],
};

export default function AuthPage() {
  return (
    <Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AuthExperience />
    </Suspense>
  );
}
