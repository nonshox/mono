"use client";

import {
  Bell,
  House,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Dumbbell,
  PersonStanding,
  Timer,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
import { useUserStore } from "@/features/users/store";
import { useNotificationStore } from "@/features/notifications/store";
import { UserAvatar } from "@/components/interface/user-avatar";

const navItems = [
  { href: "/", label: "Home", icon: House, exact: true },
  { href: "/pushups", label: "Push-ups", icon: Dumbbell },
  { href: "/squats", label: "Squats", icon: PersonStanding },
  { href: "/plank", label: "Plank", icon: Timer },
  { href: "/challenges", label: "Challenges", icon: ShieldCheck },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: true },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const unread = useNotificationStore((state) => state.unreadCount);
  const user = useUserStore((state) => state.user);
  const loadUser = useUserStore((state) => state.load);
  const resetUser = useUserStore((state) => state.reset);
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? "";
  const name = user?.name ?? "";
  const avatar = user?.avatar ?? "";

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      resetUser();
      router.replace("/auth");
      router.refresh();
    }
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Sidebar — desktop only */}
      <aside
        aria-label="Primary navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-white lg:flex"
      >
        <div className="flex h-14 shrink-0 items-center border-b border-border/60 px-4">
          <Link
            aria-label="Mono — home"
            className="flex items-center gap-1.5 outline-none transition hover:opacity-70"
            href="/"
          >
            <Image
              alt=""
              className="rounded-[5px]"
              height={18}
              priority
              src="/logotype/logotype.png"
              width={18}
            />
            <span className="text-[12px] font-semibold tracking-tight text-foreground">
              Mono
              <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Performance
              </span>
            </span>
          </Link>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-xs font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            href="/pushups"
          >
            <Dumbbell aria-hidden="true" className="size-3.5" strokeWidth={2} />
            Train
          </Link>
        </div>

        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="grid gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href, "exact" in item ? item.exact : false);
              const Icon = item.icon;
              const showBadge = "badge" in item && item.badge && unread > 0;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-10 items-center gap-2.5 rounded-lg px-2 text-[13px] outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-muted font-semibold text-foreground"
                        : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                    href={item.href}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[18px] shrink-0"
                      strokeWidth={active ? 2 : 1.6}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[9px] font-bold leading-none text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-border/60 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar avatar={avatar} name={name || email || "?"} size={28} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[11px] font-semibold leading-4 text-foreground">
                  {name || "Account"}
                </span>
                <span className="block truncate text-[9px] leading-3 text-muted-foreground">
                  {email}
                </span>
              </span>
              <Settings
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56 border-border/60 bg-popover p-1.5 shadow-thumb" sideOffset={6}>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-2">
                  <span className="block text-xs font-semibold">{name || "Account"}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem className="rounded-md px-2 py-2 text-xs" onClick={() => router.push("/profile")}>
                <UserRound aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md px-2 py-2 text-xs" onClick={() => router.push("/settings")}>
                <Settings aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem disabled={signingOut} className="rounded-md px-2 py-2 text-xs text-destructive focus:text-destructive" onClick={() => void signOut()}>
                <LogOut aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Top bar — mobile & tablet only */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-white lg:hidden">
        <header className="h-14">
          <div className="flex h-full items-center justify-between px-4 sm:px-6">
            <Link
              aria-label="Mono — home"
              className="flex items-center gap-2 outline-none transition hover:opacity-80"
              href="/"
            >
              <Image
                alt=""
                className="rounded-[6px]"
                height={22}
                priority
                src="/logotype/logotype.png"
                width={22}
              />
              <span className="text-[13px] font-semibold tracking-tight text-foreground">
                Mono
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              <Link
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
                href="/notifications"
              >
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[9px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link
                aria-label="Settings"
                className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
                href="/settings"
              >
                <Settings aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </header>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">{children}</div>

      {/* Mobile & tablet bottom bar */}
      <div className="pointer-events-none sticky bottom-2 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <nav
          aria-label="Primary"
          className="pointer-events-auto flex h-12 min-w-0 items-stretch rounded-full border border-border/60 bg-white/95 px-1 shadow-glass backdrop-blur-sm"
        >
          {([
            { href: "/" as const, icon: House },
            { href: "/pushups" as const, icon: Dumbbell },
            { href: "/challenges" as const, icon: ShieldCheck },
            { href: "/profile" as const, icon: UserRound },
          ]).map(({ href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                aria-label={href === "/" ? "Home" : href === "/pushups" ? "Train" : href === "/challenges" ? "Challenges" : "Profile"}
                aria-current={active ? "page" : undefined}
                className="relative grid h-full w-16 place-items-center outline-none"
                href={href}
                key={href}
              >
                <Icon
                  aria-hidden
                  className={`pointer-events-none size-5 transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                  strokeWidth={active ? 2 : 1.5}
                />
                {active && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 size-1 rounded-full bg-foreground"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
