"use client";

import { House, Bell, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/features/auth/client-api";
import { MobileNav } from "@/components/interface/mobile-nav";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * App chrome: slim top bar on desktop (wordmark, links, sign out) and the
 * fixed bottom bar on mobile. Pages render inside <main>-ish containers.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/auth");
      router.refresh();
    }
  };

  return (
    <>
      <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border/60 px-6 md:flex">
        <Link
          className="text-sm font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          Mono
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            aria-label="Sign out"
            className="ml-2 grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={signingOut}
            onClick={() => void signOut()}
            title="Sign out"
            type="button"
          >
            <LogOut aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </button>
        </nav>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MobileNav />
    </>
  );
}
