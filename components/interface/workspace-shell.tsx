"use client";

import {
  ArrowLeft,
  Bell,
  BookOpenText,
  Brain as BrainIcon,
  ChevronRight,
  House,
  LogOut,
  Moon,
  Settings,
  Sun,
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
import { useUserStore } from "@/features/users/store";
import { useNotificationStore } from "@/features/notifications/store";
import { notificationHref, relativeTime } from "@/lib/notification-link";
import type { NotificationItem } from "@/features/notifications/client-api";
import { UserAvatar } from "@/components/interface/user-avatar";

const breadcrumbs: Record<string, string> = {
  "/settings": "Settings",
  "/profile": "Profile",
  "/profile/edit": "Edit profile",
  "/journal": "Journal",
  "/brain": "Brain",
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const unread = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const loading = useNotificationStore((state) => state.loading);
  const loaded = useNotificationStore((state) => state.loaded);
  const load = useNotificationStore((state) => state.load);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
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
      // Private mode / storage disabled â€” theme simply doesn't persist.
    }
  };

  useEffect(() => {
    void loadUser();
    void load();
  }, [loadUser, load]);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      resetUser();
      useNotificationStore.getState().reset();
      router.replace("/auth");
      router.refresh();
    }
  };

  const openNotification = (item: NotificationItem) => {
    if (!item.read) void markRead(item);
    const href = notificationHref(item);
    if (href) router.push(href);
  };

  const latest = items.slice(0, 7);

  return (
    <>
      {/* Navbar â€” glassy, sticky, the only top chrome */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-[1.15]">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-3 sm:px-5">
          {/* Brand */}
          <Link
            aria-label="Mono â€” home"
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
            <span className="type-brand text-foreground">
              Mono
            </span>
          </Link>

          {/* Center pill â€” desktop primary nav */}
          <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-muted/60 p-1 md:flex">
            {([
              { href: "/", icon: House, label: "Home" },
              { href: "/journal", icon: BookOpenText, label: "Journal" },
              { href: "/brain", icon: BrainIcon, label: "Brain" },
            ]).map(({ href, icon: Icon, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex h-6 items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground hover:text-foreground"
                  }`}
                  href={href}
                  key={href}
                >
                  <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* Notifications â€” icon button with dropdown panel */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative grid size-9 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bell aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-[7px] top-[7px] size-2 rounded-full bg-badge ring-2 ring-background"
                  />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[21rem] overflow-hidden rounded-2xl border-border/70 p-0"
                sideOffset={8}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <p className="type-eyebrow">
                    Notifications
                  </p>
                  {unread > 0 && (
                    <button
                      className="text-xs font-semibold text-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => void markAllRead()}
                      type="button"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[22rem] overflow-y-auto">
                  {!loaded || (loading && latest.length === 0) ? (
                    <div className="type-eyebrow grid place-items-center px-4 py-8">
                      Loading
                    </div>
                  ) : latest.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs font-semibold text-foreground">All quiet</p>
                      <p className="mt-1 text-xs text-foreground">
                        Nothing new right now.
                      </p>
                    </div>
                  ) : (
                    latest.map((item) => (
                      <button
                        className="flex w-full items-center gap-2.5 border-b border-border/40 px-3 py-2.5 text-left outline-none transition last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60"
                        key={item.id}
                        onClick={() => openNotification(item)}
                        type="button"
                      >
                        <UserAvatar avatar={item.actorAvatar} name={item.actorName} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs leading-5 text-foreground">
                            <span className="font-semibold">
                              {item.self ? "You" : item.actorName}
                            </span>{" "}
                            <span className="text-foreground">
                              {item.count > 1 ? `${item.type} Ã—${item.count}` : item.type}
                            </span>
                          </span>
                          <time
                            className="mt-0.5 block text-xs tabular-nums text-foreground"
                            dateTime={item.createdAt}
                          >
                            {relativeTime(item.createdAt)}
                          </time>
                        </span>
                        {!item.read && (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-badge"
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="grid size-9 place-items-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserAvatar name={name || email || "?"} size={26} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2">
                    <span className="block text-xs font-semibold">{name || "Account"}</span>
                    <span className="block truncate text-xs text-foreground">{email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg px-2 py-2 text-xs" onClick={() => router.push("/profile")}>
                  <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-2 py-2 text-xs" onClick={() => router.push("/brain")}>
                  <BrainIcon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Brain
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-2 py-2 text-xs" onClick={toggleTheme}>
                  {dark ? (
                    <Sun aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  ) : (
                    <Moon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  )}
                  {dark ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-2 py-2 text-xs" onClick={() => router.push("/journal")}>
                  <BookOpenText aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Journal
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-2 py-2 text-xs" onClick={() => router.push("/settings")}>
                  <Settings aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg px-2 py-2 text-xs hover:bg-destructive/10 focus:bg-destructive/10 data-[variant=destructive]:focus:bg-destructive/15 data-[variant=destructive]:text-destructive"
                  onClick={() => void signOut()}
                  variant="destructive"
                >
                  <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Breadcrumb â€” back arrow + section */}
        {breadcrumb && (
          <div className="border-t border-border/50">
            <div className="mx-auto flex h-8 max-w-7xl items-center gap-1 px-2 text-xs text-foreground sm:px-4">
              <Link
                aria-label="Back to home"
                className="grid size-6 place-items-center rounded-md outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={2} />
              </Link>
              <Link
                aria-label="Home"
                className="grid size-6 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/"
              >
                <House aria-hidden="true" className="size-3" strokeWidth={1.8} />
              </Link>
              <ChevronRight aria-hidden="true" className="size-3 text-foreground" strokeWidth={2} />
              <span aria-current="page" className="type-eyebrow text-foreground">
                {breadcrumb}
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {/* Mobile bottom pill â€” glassy, icons only */}
      <div className="pointer-events-none sticky bottom-3 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.25rem)] lg:hidden">
        <nav
          aria-label="Primary"
          className="pointer-events-auto flex h-12 items-stretch gap-0.5 rounded-full border border-border/70 bg-background/75 px-1 backdrop-blur-xl"
        >
          {([
            { href: "/", icon: House, label: "Home" },
            { href: "/journal", icon: BookOpenText, label: "Journal" },
            { href: "/brain", icon: BrainIcon, label: "Brain" },
            { href: "/profile", icon: UserRound, label: "Profile" },
          ]).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
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


