import type { NotificationItem } from "./client-api";

/** Sum the unread count across the visible list. */
export function countUnread(items: NotificationItem[]): number {
  return items.reduce((sum, item) => sum + (item.read ? 0 : 1), 0);
}

/** Flip a single entry to read. */
export function markReadInList(
  items: NotificationItem[],
  id: string,
): NotificationItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
}

/** Flip every entry to read. */
export function markAllReadInList(
  items: NotificationItem[],
): NotificationItem[] {
  return items.map((item) => ({ ...item, read: true }));
}

/** Keep only unread entries (used by "Clear read"). */
export function keepUnreadInList(
  items: NotificationItem[],
): NotificationItem[] {
  return items.filter((item) => !item.read);
}
