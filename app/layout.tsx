import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mono",
    template: "%s | Mono",
  },
  description: "Mono — a minimal app base.",
  manifest: "/manifest.webmanifest",
  applicationName: "Mono",
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
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
