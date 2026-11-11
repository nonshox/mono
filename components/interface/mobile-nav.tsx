"use client";

import { Bell, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/features/notifications/store";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const unread = useNotificationStore((state) => state.unreadCount);

  return (
    <nav
      aria-label="Primary"
      className="z-30 shrink-0 border-t border-border/80 bg-background/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_14px_rgba(0,0,0,0.07)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-12 max-w-md grid-cols-3">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.href === "/notifications" ? unread : 0;

          return (
            <li className="min-w-0" key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  badge > 0 ? `${item.label}, ${badge} unread` : item.label
                }
                className="group relative flex h-full items-center justify-center outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                href={item.href}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-5 transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.6}
                />
                {badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold tabular-nums leading-none text-white"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
