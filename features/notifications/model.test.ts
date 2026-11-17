import { describe, expect, it } from "vitest";
import {
  allUnreadIds,
  chunk,
  countUnread,
  flattenPages,
  keepUnreadInPages,
  markAllReadInPages,
  markReadInPages,
} from "./model";
import type { NotificationItem, NotificationPage } from "./client-api";

const firstNotification: NotificationItem = {
  id: "notification-1",
  type: "followed you",
  actorId: "actor-1",
  actorName: "Friend",
  ref: "post-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  read: false,
  count: 1,
  ids: ["notification-1"],
  self: false,
};

const secondNotification: NotificationItem = {
  ...firstNotification,
  id: "notification-2",
  actorId: "actor-2",
};

const page = (items: NotificationItem[], nextCursor: string | null = null): NotificationPage => ({
  items,
  nextCursor,
  unreadCount: items.reduce((sum, item) => sum + (item.read ? 0 : item.count), 0),
});

describe("notification model", () => {
  it("merges pages, de-duplicates by id, and counts grouped unread", () => {
    const pages = [
      page([firstNotification, secondNotification], "next"),
      page([secondNotification], null),
    ];

    const items = flattenPages(pages);
    expect(items.map((item) => item.id)).toEqual(["notification-1", "notification-2"]);
    expect(countUnread(items)).toBe(2);
  });

  it("marks a single entry read and drops its grouped count from the total", () => {
    const grouped = {
      ...firstNotification,
      count: 3,
      ids: ["notification-1", "notification-2", "notification-3"],
    };
    const pages = [page([grouped])];

    const updated = markReadInPages(pages, grouped);
    expect(updated[0].items[0].read).toBe(true);
    expect(countUnread(flattenPages(updated))).toBe(0);
    expect(allUnreadIds([grouped])).toEqual([
      "notification-1",
      "notification-2",
      "notification-3",
    ]);
  });

  it("marks every entry in every page read", () => {
    const pages = [
      page([firstNotification], "next"),
      page([secondNotification], null),
    ];

    const updated = markAllReadInPages(pages);
    expect(updated.flatMap((entry) => entry.items).every((item) => item.read)).toBe(true);
    expect(countUnread(flattenPages(updated))).toBe(0);
    expect(allUnreadIds(flattenPages(updated))).toEqual([]);
  });

  it("keeps unread in every page and preserves nothing read", () => {
    const pages = [
      page([firstNotification, { ...secondNotification, read: true }], "next"),
      page([{ ...secondNotification, id: "notification-3", read: true }], null),
    ];

    const updated = keepUnreadInPages(pages);
    expect(updated[0].items.map((item) => item.id)).toEqual(["notification-1"]);
    expect(updated[1].items).toEqual([]);
  });

  it("chunks id batches at 50 per API call", () => {
    const ids = Array.from({ length: 120 }, (_, index) => `id-${index}`);
    const batches = chunk(ids, 50);
    expect(batches.map((batch) => batch.length)).toEqual([50, 50, 20]);
  });
});
