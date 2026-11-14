"use client";

import { Bell, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "@/features/notifications/client-api";
import { useNotificationStore } from "@/features/notifications/store";
import { UserAvatar } from "@/components/interface/user-avatar";
import { EmptyState } from "@/components/interface/empty-state";

/** Where a notification should take you when tapped. */
function hrefFor(item: NotificationItem): string | null {
  if (item.type.startsWith("followed")) return `/profile/${item.actorId}`;
  if (item.ref?.startsWith("achievement:")) return "/profile";
  if (item.ref?.startsWith("challenge:")) {
    return `/challenges/${item.ref.slice("challenge:".length)}`;
  }
  if (item.ref === "leaderboard") return "/leaderboard";
  if (item.ref && item.type.includes("overtake")) return `/challenges/${item.ref}`;
  return null;
}

const filters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
] as const;
type FilterId = (typeof filters)[number]["id"];

export function NotificationExperience() {
  const router = useRouter();
  const { items, unreadCount, cursor, loading, loadingMore, loaded, load, loadMore, markAllRead, markRead, error } = useNotificationStore();
  const [filter, setFilter] = useState<FilterId>("all");

  const visible = useMemo(
    () => items.filter((item) => filter === "all" || !item.read),
    [items, filter],
  );

  const groups = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    for (const item of visible) {
      (new Date(item.createdAt) >= startOfToday ? today : earlier).push(item);
    }
    return [
      { label: "Today", items: today },
      { label: "Earlier", items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [visible]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalUnread = unreadCount;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
      {/* Header */}
      <header className="flex items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h1 className="text-lg font-semibold sm:text-xl tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            className="shrink-0 text-xs sm:text-sm font-semibold text-primary outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            disabled={items.every((i) => i.read)}
            onClick={() => void markAllRead()}
            type="button"
          >
            Mark all read
          </button>
        )}
      </header>

      {/* Filter tabs — underline style */}
      <div
        aria-label="Filter notifications"
        className="flex items-center gap-4 border-b border-border/60"
        role="group"
      >
        {filters.map((item) => {
          const isActive = filter === item.id;
          return (
            <button
              aria-pressed={isActive}
              className={`-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 text-xs sm:text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground"
              }`}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
              {item.id === "unread" && totalUnread > 0 && (
                <span className="tabular-nums text-[11px] text-muted-foreground">
                  {totalUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-3 flex items-center justify-between gap-3 border-b border-destructive/20 py-2"
          role="alert"
        >
          <p className="text-xs sm:text-sm text-destructive">{error}</p>
          <button
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
            onClick={() => void load(true)}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {loading && !loaded ? (
        <ul className="divide-y divide-border/60 border-b border-border/60">
          {[0, 1, 2, 3, 4].map((i) => (
            <li className="flex items-center gap-3 py-2.5 sm:py-3" key={i}>
              <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="grid flex-1 gap-1">
                <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-2.5 w-8 animate-pulse rounded-full bg-muted" />
            </li>
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <div className="border-b border-border/60 py-10">
          <EmptyState
            description="Overtakes, badges and challenge wins will land here."
            icon={Bell}
            title="Nothing yet"
          />
        </div>
      ) : (
        groups.map((group) => (
          <section aria-label={group.label} className="mt-4" key={group.label}>
            <h2 className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </h2>
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {group.items.map((item) => (
                <li key={item.id}>
                  <div
                    aria-label={`${item.self ? "You" : item.actorName} ${item.type}`}
                    className="flex cursor-pointer items-center gap-2.5 py-2.5 sm:py-3 outline-none transition hover:bg-muted/40 focus-visible:bg-muted/40"
                    onClick={() => {
                      const href = hrefFor(item);
                      if (!item.read) void markRead(item);
                      if (href) router.push(href);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const href = hrefFor(item);
                        if (!item.read) void markRead(item);
                        if (href) router.push(href);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="grid w-2 shrink-0 place-items-center">
                      {!item.read && (
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                      )}
                    </span>
                    <UserAvatar avatar={item.actorAvatar} name={item.actorName} size={28} />
                    <span className="min-w-0 flex-1 truncate text-xs sm:text-sm leading-4 text-foreground">
                      <span className="font-medium">
                        {item.self ? "You" : item.actorName}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {item.count > 1 ? `${item.type} ×${item.count}` : item.type}
                      </span>
                    </span>
                    <time
                      className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground/80"
                      dateTime={item.createdAt}
                    >
                      {formatRelative(item.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <button
            className="text-xs sm:text-sm font-semibold text-primary outline-none transition hover:underline disabled:opacity-40"
            disabled={loadingMore || loading}
            onClick={() => void loadMore()}
            type="button"
          >
            {loadingMore ? "Loading…" : "Load older"}
          </button>
        </div>
      )}
    </div>
  );
}

function formatRelative(value: string): string {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
