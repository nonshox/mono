"use client";

import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/features/notifications/client-api";
import { useNotificationStore } from "@/features/notifications/store";
import { UserAvatar } from "@/components/interface/user-avatar";
import { EmptyState } from "@/components/interface/empty-state";

const filters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
] as const;
type FilterId = (typeof filters)[number]["id"];

export function NotificationExperience() {
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:px-6 md:pt-8 lg:pt-10">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="type-eyebrow text-primary">Inbox</p>
          <h1 className="type-section mt-1 text-foreground">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <Button
            className="rounded-full text-[11px] font-semibold h-8 px-3 border-border/60"
            disabled={items.every((i) => i.read)}
            onClick={() => void markAllRead()}
            size="sm"
            variant="outline"
          >
            <CheckCheck aria-hidden="true" className="size-3.5" />
            Mark all read
          </Button>
        )}
      </header>

      {/* Filter tabs — compact segmented control */}
      <div
        aria-label="Filter notifications"
        className="inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5"
        role="group"
      >
        {filters.map((item) => {
          const isActive = filter === item.id;
          return (
            <button
              aria-pressed={isActive}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "bg-card text-foreground shadow-thumb"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
              {item.id === "unread" && unreadCount > 0 && (
                <span className="tabular-nums opacity-70">{unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
          role="alert"
        >
          <p className="text-xs text-destructive">{error}</p>
          <Button
            className="h-7 px-2.5 text-[11px]"
            disabled={loading}
            onClick={() => void load(true)}
            size="sm"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      {loading && !loaded ? (
        <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div className="flex items-center gap-3 px-3 py-3" key={i}>
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="grid flex-1 gap-1.5">
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
                <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          description="When someone interacts with you, it will appear here."
          icon={Bell}
          title="Inbox zero"
        />
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <section aria-label={group.label} key={group.label}>
              <h2 className="type-eyebrow mb-1.5 flex items-center justify-between px-1">
                {group.label}
                <span className="text-muted-foreground/60 text-[10px] font-medium normal-case tracking-normal">
                  {group.items.length} event{group.items.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                {group.items.map((item) => (
                  <div
                    className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
                    key={item.id}
                    onClick={() => {
                      if (!item.read) void markRead(item);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!item.read) void markRead(item);
                      }
                    }}
                  >
                    <UserAvatar avatar={item.actorAvatar} name={item.actorName} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-foreground">
                        <span className="font-semibold">{item.actorName}</span>{" "}
                        <span className="text-foreground/80">
                          {item.count > 1 ? `${item.type} ${item.count}x` : item.type}
                        </span>
                      </p>
                      <time
                        className="mt-0.5 block text-[10px] font-medium text-muted-foreground"
                        dateTime={item.createdAt}
                      >
                        {formatRelative(item.createdAt)}
                      </time>
                    </div>
                    {!item.read && (
                      <button
                        aria-label="Mark as read"
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markRead(item);
                        }}
                        type="button"
                      >
                        <Check aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-5 flex justify-center">
          <Button
            className="min-w-36 h-9 rounded-full text-xs"
            disabled={loadingMore || loading}
            onClick={() => void loadMore()}
            size="sm"
            variant="outline"
          >
            {loadingMore ? "Loading older…" : "Load older"}
          </Button>
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
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
