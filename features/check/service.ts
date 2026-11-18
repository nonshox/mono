import "server-only";

import { AppwriteException, ID, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound, runTransaction } from "@/lib/appwrite/tables";
import { sha256RowId } from "@/lib/row-id";
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
  rise: ["Wake up and make the bed", "Shower", "One line in the dot"],
  midday: ["Deep work block", "Lunch away from the screen", "A walk"],
  evening: ["Plan tomorrow — just 3 lines", "Phone away", "Wind down"],
};

/** Seeds the default three buckets for a brand-new user. Returns the post-seed items. */
export async function ensureTimelineSeed(
  userId: string,
): Promise<TimelineItem[]> {
  const existing = await listTimeline(userId);
  if (existing.length > 0) return existing;
  const tables = getTables();
  // Deterministic ids make concurrent first-loads converge instead of duplicating.
  const seedId = (bucket: Bucket, index: number) =>
    sha256RowId(`${userId}:seed:${bucket}:${index}`);
  await Promise.all(
    BUCKETS.flatMap((bucket) =>
      DEFAULT_ITEMS[bucket].map((text, index) =>
        tables
          .createRow<TimelineRow>({
            databaseId: getDatabaseId(),
            tableId,
            rowId: seedId(bucket, index),
            permissions: [],
            data: { user: userId, bucket, text, order: index, done: false },
          })
          .catch((error) => {
            if (error instanceof AppwriteException && error.code === 409) return;
            throw error;
          }),
      ),
    ),
  );
  return listTimeline(userId); // freshly seeded state — one read, not two
}

export async function createTimelineItem(
  userId: string,
  bucket: Bucket,
  text: string,
): Promise<TimelineItem> {
  const tables = getTables();
  const last = await tables.listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("bucket", bucket),
      Query.orderDesc("order"),
      Query.select(["order"]),
      Query.limit(1),
    ],
    total: false,
  });
  const nextOrder = (last.rows[0]?.order ?? -1) + 1;
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

/**
 * Rewrites `order` for one bucket from the given id list, in a single
 * transaction. The list must contain exactly the bucket's rows — a mismatch
 * (concurrent edits) fails instead of corrupting order.
 */
export async function reorderTimelineItems(
  userId: string,
  bucket: Bucket,
  ids: string[],
): Promise<boolean> {
  const tables = getTables();
  const existing = await tables.listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("bucket", bucket),
      Query.select(["$id", "order"]),
      Query.limit(500),
    ],
    total: false,
  });

  const current = new Map(existing.rows.map((row) => [row.$id, row.order]));
  if (current.size !== ids.length) return false;
  if (!ids.every((id) => current.has(id))) return false;
  const unique = new Set(ids);
  if (unique.size !== ids.length) return false;

  await runTransaction(async (transactionId) => {
    for (const [index, id] of ids.entries()) {
      if (current.get(id) === index) continue;
      await tables.updateRow<TimelineRow>({
        databaseId: getDatabaseId(),
        tableId,
        rowId: id,
        transactionId,
        data: { order: index },
      });
    }
  }, "Reorder timeline items");

  return true;
}

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
  // Atomic swap — either both order writes commit or neither does.
  await runTransaction(async (transactionId) => {
    await tables.updateRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
      transactionId,
      data: { order: neighbor.order },
    });
    await tables.updateRow<TimelineRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: neighbor.$id,
      transactionId,
      data: { order: targetOrder },
    });
  }, "Move timeline item");
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

/** Reset ticks for the day — clears only the rows that need clearing. */
export async function clearCheckTicks(userId: string): Promise<void> {
  const tables = getTables();
  const doneRows = await tables.listRows<TimelineRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("done", true),
      Query.select(["$id"]),
      Query.limit(200),
    ],
    total: false,
  });
  await Promise.all(
    doneRows.rows.map((row) =>
      tables.updateRow<TimelineRow>({
        databaseId: getDatabaseId(),
        tableId,
        rowId: row.$id,
        data: { done: false },
      }),
    ),
  );
}
