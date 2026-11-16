import "server-only";

import { ID, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import {
  BUCKETS,
  type Bucket,
  type TimelineItem,
} from "./types";

export type { Bucket, TimelineItem } from "./types";
export { BUCKETS, BUCKET_LABELS } from "./types";

export type TimelineRow = Models.Row & {
  user: string;
  bucket: Bucket;
  text: string;
  order: number;
  done: boolean;
};

const tableId = "timeline";

export async function listTimeline(userId: string): Promise<TimelineItem[]> {
  const result = await getTables().listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.select(["$id", "bucket", "text", "order", "done"]),
      Query.limit(200),
    ],
    total: false,
  });
  const rank = (bucket: Bucket) => BUCKETS.indexOf(bucket);
  return result.rows
    .map((row) => ({
      id: row.$id,
      bucket: row.bucket,
      text: row.text,
      order: row.order,
      done: row.done,
    }))
    .sort((a, b) => rank(a.bucket) - rank(b.bucket) || a.order - b.order);
}

const DEFAULT_ITEMS: Record<Bucket, string[]> = {
  rise: ["Wake up and make the bed", "Shower", "Today's one line in the dot"],
  midday: ["Deep work block", "Lunch away from the screen", "A walk"],
  evening: ["Plan tomorrow — just 3 lines", "Phone away", "Wind down"],
};

/** Seeds the default three buckets for a brand-new user. */
export async function ensureTimelineSeed(userId: string): Promise<void> {
  const existing = await listTimeline(userId);
  if (existing.length > 0) return;
  const tables = getTables();
  await Promise.all(
    BUCKETS.flatMap((bucket) =>
      DEFAULT_ITEMS[bucket].map((text, index) =>
        tables.createRow<TimelineRow>({
          databaseId: getDatabaseId(),
          tableId,
          rowId: ID.unique(),
          permissions: [],
          data: { user: userId, bucket, text, order: index, done: false },
        }),
      ),
    ),
  );
}

export async function createTimelineItem(
  userId: string,
  bucket: Bucket,
  text: string,
): Promise<TimelineItem> {
  const tables = getTables();
  const siblings = await tables.listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("bucket", bucket),
      Query.select(["order"]),
      Query.limit(100),
    ],
    total: false,
  });
  const nextOrder = siblings.rows.length;
  const row = await tables.createRow<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: ID.unique(),
    permissions: [],
    data: { user: userId, bucket, text, order: nextOrder, done: false },
  });
  return {
    id: row.$id,
    bucket: row.bucket,
    text: row.text,
    order: row.order,
    done: row.done,
  };
}

export async function setTimelineItemDone(
  userId: string,
  id: string,
  done: boolean,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.updateRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
      data: { done },
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/** Swap `order` between `id` and its neighbor in the direction. */
export async function moveTimelineItem(
  userId: string,
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  const tables = getTables();
  const target = await tables
    .getRow<TimelineRow>({ databaseId: getDatabaseId(), tableId, rowId: id })
    .catch((error) => {
      if (isNotFound(error)) return null;
      throw error;
    });
  if (!target || target.user !== userId) return false;

  const ordered = await tables.listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("bucket", target.bucket),
      Query.select(["$id", "order"]),
      Query.orderAsc("order"),
      Query.limit(500),
    ],
    total: false,
  });

  const index = ordered.rows.findIndex((row) => row.$id === id);
  if (index === -1) return false;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.rows.length) return true;

  const targetOrder = target.order;
  const neighbor = ordered.rows[swapIndex];
  await tables.updateRow<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: id,
    data: { order: neighbor.order },
  });
  await tables.updateRow<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: neighbor.$id,
    data: { order: targetOrder },
  });
  return true;
}

export async function updateTimelineItemText(
  userId: string,
  id: string,
  text: string,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.updateRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
      data: { text },
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function deleteTimelineItem(
  userId: string,
  id: string,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.deleteRow({ databaseId: getDatabaseId(), tableId, rowId: id });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/** Reset ticks for the day — called when the user says "no" to satisfaction at day end. */
export async function clearTodayTicks(userId: string): Promise<void> {
  const items = await listTimeline(userId);
  const tables = getTables();
  await Promise.all(
    items
      .filter((item) => item.done)
      .map((item) =>
        tables.updateRow<TimelineRow>({
          databaseId: getDatabaseId(),
          tableId,
          rowId: item.id,
          data: { done: false },
        }),
      ),
  );
}

/** Month-day-range key for today (UTC, matches the days table). */
export function todayDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fetch today's full state — items + satisfied percentage. Seeds on first visit. */
export async function loadTodayBundle(
  userId: string,
): Promise<{
  items: TimelineItem[];
  satisfied: number | null;
  day: string;
}> {
  await ensureTimelineSeed(userId);
  const { getDaySatisfied } = await import("@/features/days/service");
  const [items, satisfied] = await Promise.all([
    listTimeline(userId),
    getDaySatisfied(userId, todayDay()),
  ]);
  return { items, satisfied, day: todayDay() };
}
