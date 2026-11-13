"use client";

import {
  ArrowLeft,
  Bell,
  ChevronRight,
  House,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Dumbbell,
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
import { fetchUser } from "@/features/users/client-api";
import { useNotificationStore } from "@/features/notifications/store";
import { UserAvatar } from "@/components/interface/user-avatar";

const routeTitles: Record<string, string> = {
  "/pushups": "Push-ups",
  "/challenges": "Challenges",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
  "/profile/edit": "Edit profile",
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const unread = useNotificationStore((state) => state.unreadCount);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetchUser()
      .then((user) => {
        if (!active) return;
        setEmail(user.email);
        setName(user.name);
        setAvatar(user.avatar ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <header className="h-14">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
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

            {/* Desktop cluster */}
            <div className="hidden items-center gap-1.5 md:flex">
              <Link
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary outline-none transition hover:bg-primary/10"
                href="/pushups"
              >
                <Dumbbell aria-hidden="true" className="size-3.5" strokeWidth={2} />
                Train
              </Link>
              <Link
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative grid size-8 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
                href="/notifications"
              >
                <Bell aria-hidden="true" className="size-4" strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[9px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="flex items-center rounded-full p-0.5 outline-none transition hover:bg-muted"
                >
                  <UserAvatar avatar={avatar} name={name || email || "?"} size={26} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border/60 bg-popover p-1.5 shadow-thumb" sideOffset={6}>
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

            {/* Mobile cluster */}
            <div className="flex items-center gap-1 md:hidden">
              <Link
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative grid size-8 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
                href="/notifications"
              >
                <Bell aria-hidden="true" className="size-4" strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[9px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link
                aria-label="Settings"
                className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
                href="/settings"
              >
                <Settings aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* Breadcrumb — desktop only */}
      {pathname !== "/" && (
        <div className="hidden h-9 shrink-0 items-center border-b border-border/60 bg-background/50 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-1 px-6">
            <button
              aria-label="Back"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
              onClick={() => router.back()}
              type="button"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
            </button>
            <Link
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground"
              href="/"
            >
              <House className="size-4" strokeWidth={1.75} />
            </Link>
            <ChevronRight className="size-4 text-muted-foreground/40" strokeWidth={1.75} />
            <span aria-current="page" className="text-xs font-medium text-foreground">
              {routeTitles[pathname] ??
                pathname
                  .split("/")
                  .filter(Boolean)
                  .map((s) => s.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase()))
                  .join(" / ")}
            </span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {/* Mobile bottom bar — slim, pure, frosted */}
      <div className="pointer-events-none sticky bottom-2 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
        <nav
          aria-label="Primary"
          className="pointer-events-auto flex h-12 min-w-0 items-stretch rounded-full border border-border/70 bg-card/80 px-1 shadow-glass backdrop-blur-xl backdrop-saturate-[1.1]"
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
                className="grid h-full w-16 place-items-center outline-none"
                href={href}
                key={href}
              >
                <Icon
                  aria-hidden
                  className={`size-5 transition-colors pointer-events-none ${
                    active ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                  strokeWidth={active ? 2 : 1.5}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
