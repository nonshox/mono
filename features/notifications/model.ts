import type { NotificationItem, NotificationPage } from "./client-api";

/** Merge every loaded page into one de-duplicated list. */
export function flattenPages(pages: NotificationPage[]): NotificationItem[] {
  const merged: NotificationItem[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

/** Sum the unread grouped counts across the visible items. */
export function countUnread(items: NotificationItem[]): number {
  return items.reduce((sum, item) => sum + (item.read ? 0 : item.count), 0);
}

/** Flip a single entry (matched by id) to read within every page. */
export function markReadInPages(
  pages: NotificationPage[],
  target: NotificationItem,
): NotificationPage[] {
  return pages.map((page) => ({
    ...page,
    items: page.items.map((entry) =>
      entry.id === target.id ? { ...entry, read: true } : entry,
    ),
  }));
}

/** Flip every entry to read within every page. */
export function markAllReadInPages(pages: NotificationPage[]): NotificationPage[] {
  return pages.map((page) => ({
    ...page,
    items: page.items.map((entry) => ({ ...entry, read: true })),
  }));
}

/** Keep only unread entries in every page (used by "Clear read"). */
export function keepUnreadInPages(pages: NotificationPage[]): NotificationPage[] {
  return pages.map((page) => ({
    ...page,
    items: page.items.filter((entry) => !entry.read),
  }));
}

/** De-duplicated union of grouped ids for every unread entry. */
export function allUnreadIds(items: NotificationItem[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.read) continue;
    for (const id of item.ids ?? [item.id]) ids.add(id);
  }
  return [...ids];
}

/** Split an array into fixed-size batches (the API accepts 50 ids per call). */
export function chunk<T>(values: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < values.length; start += size) {
    batches.push(values.slice(start, start + size));
  }
  return batches;
}
