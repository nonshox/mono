"use client";

import {
  ArrowLeft,
  BookOpenText,
  BookOpen,
  ChevronRight,
  House,
  LogOut,
  Moon,
  Settings,
  Sun,
  ListChecks,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/client-api";
import { saveUserTz } from "@/features/users/client-api";
import { useUserStore } from "@/features/users/store";
import { NotificationBell } from "@/components/interface/notification-bell";
import { UserAvatar } from "@/components/interface/user-avatar";

const breadcrumbs: Record<string, string> = {
  "/settings": "Settings",
  "/profile": "Profile",
  "/profile/edit": "Edit profile",
  "/journal": "Journal",
  "/check": "Check",
  "/library": "Library",
};

// Single source for both nav surfaces (desktop pill + mobile bottom pill).
const NAV_ITEMS = [
  { href: "/", icon: House, label: "Home" },
  { href: "/journal", icon: BookOpenText, label: "Journal" },
  { href: "/check", icon: ListChecks, label: "Check" },
  { href: "/library", icon: BookOpen, label: "Library" },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((state) => state.user);
  const loadUser = useUserStore((state) => state.load);
  const resetUser = useUserStore((state) => state.reset);

  const email = user?.email ?? "";
  const name = user?.name ?? "";
  const breadcrumb = breadcrumbs[pathname] ?? null;

  // Mirror the html.dark class the pre-paint script set (live subscription).
  const dark = useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mono-theme", next ? "dark" : "light");
    } catch {
      // Private mode / storage disabled — theme simply doesn't persist.
    }
  };

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // Silently remember the browser's timezone — drives the evening nudge.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!user || !tz || user.tz === tz) return;
    void saveUserTz(tz)
      .then((saved) => useUserStore.getState().setUser(saved))
      .catch(() => {
        // Best-effort — the nudge falls back to UTC if unknown.
      });
  }, [user]);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      resetUser();
      router.replace("/auth");
      router.refresh();
    }
  };

  return (
    <>
      {/* Navbar — glassy, sticky, the only top chrome */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-[1.15]">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-3 sm:px-5">
          {/* Brand */}
          <Link
            aria-label="Mono — home"
            className="flex shrink-0 items-center gap-2 outline-none transition hover:opacity-70"
            href="/"
          >
            <Image
              alt=""
              className="rounded-[5px]"
              height={18}
              priority
              src="/logotype/apple-touch-icon.png"
              width={18}
            />
            <span className="type-brand text-foreground">Mono</span>
          </Link>

          {/* Center pill — desktop primary nav */}
          <nav
            aria-label="Primary"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border-2 border-border bg-muted/60 p-1 md:flex"
          >
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex h-6 items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground hover:text-foreground"
                  }`}
                  href={href}
                  key={href}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={1.8}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* Notifications — opens on tap; loads only when opened */}
            <NotificationBell />

            {/* Account */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="grid size-9 place-items-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserAvatar
                  avatar={user?.avatar || undefined}
                  name={name || email || "?"}
                  size={26}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2">
                    <span className="flex items-center gap-2.5">
                      <UserAvatar
                        avatar={user?.avatar || undefined}
                        name={name || email || "?"}
                        size={32}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">
                          {name || "Account"}
                        </span>
                        <span className="block truncate text-xs text-foreground">
                          {email}
                        </span>
                      </span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg px-2 py-2 text-xs"
                  onClick={() => router.push("/profile")}
                >
                  <UserRound
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg px-2 py-2 text-xs"
                  onClick={toggleTheme}
                >
                  {dark ? (
                    <Sun
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Moon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  )}
                  {dark ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg px-2 py-2 text-xs"
                  onClick={() => router.push("/settings")}
                >
                  <Settings
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg px-2 py-2 text-xs hover:bg-destructive/10 focus:bg-destructive/10 data-[variant=destructive]:focus:bg-destructive/15 data-[variant=destructive]:text-destructive"
                  onClick={() => void signOut()}
                  variant="destructive"
                >
                  <LogOut
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Breadcrumb — back arrow + section */}
        {breadcrumb && (
          <div className="border-t border-border/50">
            <div className="mx-auto flex h-8 max-w-7xl items-center gap-1 px-2 text-xs text-foreground sm:px-4">
              <Link
                aria-label="Back to home"
                className="grid size-8 place-items-center rounded-md outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={2}
                />
              </Link>
              <Link
                aria-label="Home"
                className="grid size-8 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                <House
                  aria-hidden="true"
                  className="size-3"
                  strokeWidth={1.8}
                />
              </Link>
              <ChevronRight
                aria-hidden="true"
                className="size-3 text-foreground"
                strokeWidth={2}
              />
              <span
                aria-current="page"
                className="type-eyebrow text-foreground"
              >
                {breadcrumb}
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {/* Mobile bottom pill — glassy, icons only */}
      <div className="pointer-events-none sticky bottom-3 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.25rem)] lg:hidden">
        <nav
          aria-label="Primary"
          className="pointer-events-auto flex h-12 items-stretch gap-0.5 rounded-full border-2 border-border bg-background/75 px-1 backdrop-blur-xl"
        >
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="relative grid h-full w-16 place-items-center outline-none"
                href={href}
                key={href}
              >
                <Icon
                  aria-hidden
                  className={`size-[19px] transition-colors ${
                    active ? "text-foreground" : "text-foreground"
                  }`}
                  strokeWidth={active ? 2.1 : 1.6}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
