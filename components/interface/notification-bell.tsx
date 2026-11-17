"use client";

import { Bell, CheckCheck, Eraser, Loader2, Mail, Moon, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
    case "day_ending":
      return <Moon aria-hidden="true" className={className} strokeWidth={1.8} />;
    default:
      return (
        <NotebookPen aria-hidden="true" className={className} strokeWidth={1.8} />
      );
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

  const hasRead = items.some((item) => item.read);

  const openNotification = (item: NotificationItem) => {
    // Only unread items reach here — read ones render as passive rows.
    void markRead(item);
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
          <div className="flex items-center">
            {hasRead && (
              <AlertDialog>
                <AlertDialogTrigger
                  aria-label="Clear read notifications"
                  className="grid size-7 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  title="Clear read"
                  type="button"
                >
                  <Eraser
                    aria-hidden="true"
                    className="size-4 text-foreground"
                    strokeWidth={1.8}
                  />
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
                aria-label="Mark all as read"
                className="grid size-7 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void markAllRead()}
                title="Mark all as read"
                type="button"
              >
                <CheckCheck
                  aria-hidden="true"
                  className="size-4 text-foreground"
                  strokeWidth={1.8}
                />
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
              <div className="grid place-items-center px-4 py-8">
                <Loader2
                  aria-hidden="true"
                  className="size-5 animate-spin text-foreground"
                  strokeWidth={1.8}
                />
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
            items.map((item) =>
              item.read ? (
                // Read-only row — the notification has served its purpose.
                <div
                  aria-disabled="true"
                  className="flex w-full items-start gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-b-0"
                  key={item.id}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-4 shrink-0 place-items-center opacity-40"
                  >
                    {iconFor(item.kind)}
                  </span>
                  <span className="min-w-0 flex-1 opacity-60">
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
                </div>
              ) : (
                <DropdownMenuItem
                  className="flex cursor-pointer items-start gap-2 px-3 py-2.5 text-xs leading-5 text-foreground outline-none transition last:border-b-0 hover:bg-muted/60 focus:bg-muted/60"
                  key={item.id}
                  onClick={() => openNotification(item)}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-4 shrink-0 place-items-center"
                  >
                    {iconFor(item.kind)}
                  </span>
                  <span className="min-w-0 flex-1">
                    {item.body}
                    <time
                      className="mt-0.5 block text-[11px] tabular-nums text-foreground"
                      dateTime={item.createdAt}
                    >
                      {relativeTime(item.createdAt)}
                    </time>
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-badge"
                  />
                </DropdownMenuItem>
              ),
            )
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
