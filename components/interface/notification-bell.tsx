"use client";

import { Bell, Eraser, Flame, Mail, NotebookPen, Sunset } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/features/notifications/use-notifications";
import { notificationHref, relativeTime } from "@/lib/notification-link";
import type { NotificationItem } from "@/features/notifications/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const iconFor = (kind: NotificationItem["kind"]) => {
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

/**
 * The bell — nothing fetched until it opens; after the first open in a
 * session, mounts refresh only the unread badge count.
 */
export function NotificationBell() {
  const router = useRouter();
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

  const openNotification = (item: NotificationItem) => {
    if (!item.read) void markRead(item);
    router.push(notificationHref(item));
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void ensureLoaded();
      }}
    >
      <DropdownMenuTrigger
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
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
                className="text-xs font-semibold text-foreground outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
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
              <p className="text-xs font-semibold text-foreground">All quiet</p>
              <p className="mt-1 text-xs text-foreground">
                Nothing new right now.
              </p>
            </div>
          ) : (
            items.map((item) => (
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
                  {iconFor(item.kind)}
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
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
