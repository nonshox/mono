import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Mono",
    template: "%s | Mono",
  },
  description: "Mono — a minimal app base.",
  // Private, sign-in-only app: keep every page out of search indexes.
  // Pages inherit this; nothing here is meant to be crawled.
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    siteName: "Mono",
    title: "Mono",
    description: "Mono — a minimal app base.",
    url: "/",
    locale: "en_US",
    images: [{ url: "/logotype/android-chrome-512x512.png", width: 512, height: 512, alt: "Mono" }],
  },
  twitter: {
    card: "summary",
    title: "Mono",
    description: "Mono — a minimal app base.",
    images: ["/logotype/android-chrome-512x512.png"],
  },
  applicationName: "Mono",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mono",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/logotype/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {/* Set theme before first paint from localStorage / prefers-color-scheme */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('mono-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()",
          }}
        />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
