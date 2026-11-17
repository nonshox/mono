import { describe, expect, it } from "vitest";
import {
  countUnread,
  keepUnreadInList,
  markAllReadInList,
  markReadInList,
} from "./model";
import type { NotificationItem } from "./client-api";

const item = (id: string, read: boolean): NotificationItem => ({
  id,
  kind: "dot_closed",
  body: `dot ${id}`,
  ref: "/check",
  createdAt: "2026-11-17T00:00:00.000Z",
  read,
});

describe("notification model", () => {
  it("counts unread items", () => {
    const items = [item("a", false), item("b", true)];
    expect(countUnread(items)).toBe(1);
  });

  it("flips one entry to read", () => {
    const items = [item("a", false), item("b", false)];
    const updated = markReadInList(items, "a");
    expect(updated.map((i) => i.read)).toEqual([true, false]);
  });

  it("flips every entry to read", () => {
    const items = [item("a", false), item("b", true)];
    expect(markAllReadInList(items).every((i) => i.read)).toBe(true);
  });

  it("keeps only unread entries", () => {
    const items = [item("a", false), item("b", true), item("c", false)];
    const updated = keepUnreadInList(items);
    expect(updated.map((i) => i.id)).toEqual(["a", "c"]);
  });
});
