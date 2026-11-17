"use client";

import {
  ArrowLeft,
  Bell,
  BookOpenText,
  BookOpen,
  ChevronRight,
  Eraser,
  Flame,
  House,
  LogOut,
  Mail,
  Moon,
  NotebookPen,
  Settings,
  Sun,
  Sunset,
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
import { useNotifications } from "@/features/notifications/use-notifications";
import type { NotificationItem } from "@/features/notifications/client-api";
import { notificationHref, relativeTime } from "@/lib/notification-link";
import { UserAvatar } from "@/components/interface/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

const breadcrumbs: Record<string, string> = {
  "/settings": "Settings",
  "/profile": "Profile",
  "/profile/edit": "Edit profile",
  "/journal": "Journal",
  "/check": "Check",
  "/library": "Library",
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    items,
    loaded,
    unreadCount: unread,
    error,
    ensureLoaded,
    markRead,
    markAllRead,
    clearRead,
  } = useNotifications();
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

  const notificationIcon = (kind: NotificationItem["kind"]) => {
    const className = "size-4 text-foreground";
    switch (kind) {
      case "letter_ready":
        return <Mail aria-hidden="true" className={className} strokeWidth={1.8} />;
      case "streak_7":
      case "streak_30":
        return <Flame aria-hidden="true" className={className} strokeWidth={1.8} />;
      case "day_ending":
        return <Sunset aria-hidden="true" className={className} strokeWidth={1.8} />;
      default:
        return <NotebookPen aria-hidden="true" className={className} strokeWidth={1.8} />;
    }
  };

  const openNotification = (item: NotificationItem) => {
    if (!item.read) void markRead(item);
    router.push(notificationHref(item));
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
            {[
              { href: "/", icon: House, label: "Home" },
              { href: "/journal", icon: BookOpenText, label: "Journal" },
              { href: "/check", icon: ListChecks, label: "Check" },
              { href: "/library", icon: BookOpen, label: "Library" },
            ].map(({ href, icon: Icon, label }) => {
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
            {/* Notifications — icon button with dropdown panel; nothing fetches until opened */}
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) void ensureLoaded();
              }}
            >
              <DropdownMenuTrigger
                aria-label={
                  unread > 0
                    ? `Notifications, ${unread} unread`
                    : "Notifications"
                }
                className="relative grid size-9 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bell
                  aria-hidden="true"
                  className="size-[17px]"
                  strokeWidth={1.8}
                />
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-[7px] top-[7px] size-2 rounded-full bg-badge ring-2 ring-background"
                  />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-border/70 p-0 sm:w-[21rem]"
                sideOffset={8}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <p className="type-eyebrow">Notifications</p>
                  <div className="flex items-center gap-3">
                    {items.some((item) => item.read) && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          aria-label="Clear read notifications"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-foreground outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Eraser aria-hidden="true" className="size-3.5" strokeWidth={2} />
                          Clear read
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Clear read notifications?</AlertDialogTitle>
                          <AlertDialogDescription className="mt-1.5">
                            Every notification you have already read will be deleted.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void clearRead()}>
                              Clear read
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
                </div>
                <div className="max-h-[22rem] overflow-y-auto">
                  {!loaded ? (
                    error ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-xs font-semibold text-foreground">Unavailable</p>
                        <p className="mt-1 text-xs text-foreground">{error}</p>
                      </div>
                    ) : (
                      <div className="type-eyebrow grid place-items-center px-4 py-8">
                        Loading
                      </div>
                    )
                  ) : error ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs font-semibold text-foreground">Unavailable</p>
                      <p className="mt-1 text-xs text-foreground">{error}</p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs font-semibold text-foreground">
                        All quiet
                      </p>
                      <p className="mt-1 text-xs text-foreground">
                        Nothing new right now.
                      </p>
                    </div>
                  ) : (
                    <>
                      {items.map((item) => (
                      <button
                        className="flex w-full items-start gap-2 border-b border-border/40 px-3 py-2.5 text-left outline-none transition last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60"
                        key={item.id}
                        onClick={() => openNotification(item)}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid size-4 shrink-0 place-items-center"
                        >
                          {notificationIcon(item.kind)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs leading-5 text-foreground">
                            {item.body}
                          </span>
                          <time
                            className="mt-0.5 block text-[11px] tabular-nums text-foreground"
                            dateTime={item.createdAt}
                          >
                            {relativeTime(item.createdAt)}
                          </time>
                        </span>
                        {!item.read && (
                          <span
                            aria-hidden="true"
                            className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-badge"
                          />
                        )}
                      </button>
                    ))}
                    </>
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
                className="grid size-6 place-items-center rounded-md outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
                className="grid size-6 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
          {[
            { href: "/", icon: House, label: "Home" },
            { href: "/journal", icon: BookOpenText, label: "Journal" },
            { href: "/check", icon: ListChecks, label: "Check" },
            { href: "/library", icon: BookOpen, label: "Library" },
          ].map(({ href, icon: Icon, label }) => {
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
