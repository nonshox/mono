import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mono Performance",
    template: "%s | Mono Performance",
  },
  description: "Camera-verified push-ups, one global leaderboard, prestige only.",
  manifest: "/manifest.webmanifest",
  applicationName: "Mono Performance",
  appleWebApp: {
    capable: true,
    title: "Mono",
    statusBarStyle: "default",
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
