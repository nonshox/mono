import "server-only";
import { AppwriteException, Query } from "node-appwrite";
import { getDatabaseId, getTables } from "@/lib/appwrite/tables";
import type { NotificationRow } from "./types";

export async function getNotificationRows(
  userId: string,
  cursor: string | null,
): Promise<NotificationRow[]> {
  const result = await getTables().listRows<NotificationRow>({
    databaseId: getDatabaseId(),
    tableId: "notifications",
    queries: [
      Query.equal("recipient", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ],
    total: false,
  });
  return result.rows;
}

/** Delete read rows older than `olderThanIso`. Best-effort; returns the count. */
export async function pruneReadNotifications(
  userId: string,
  olderThanIso: string,
): Promise<number> {
  const result = await getTables().listRows<NotificationRow>({
    databaseId: getDatabaseId(),
    tableId: "notifications",
    queries: [
      Query.equal("recipient", userId),
      Query.equal("read", true),
      Query.select(["$id", "$createdAt"]),
      Query.limit(200),
    ],
    total: false,
  });
  const stale = result.rows.filter((row) => row.$createdAt < olderThanIso);
  await Promise.allSettled(
    stale.map((row) =>
      getTables().deleteRow({
        databaseId: getDatabaseId(),
        tableId: "notifications",
        rowId: row.$id,
      }),
    ),
  );
  return stale.length;
}

/** Delete every read row for the user (manual "Clear read"). Returns the count. */
export async function clearReadNotifications(userId: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const result = await getTables().listRows<NotificationRow>({
      databaseId: getDatabaseId(),
      tableId: "notifications",
      queries: [
        Query.equal("recipient", userId),
        Query.equal("read", true),
        Query.select(["$id"]),
        Query.limit(100),
      ],
      total: false,
    });
    if (result.rows.length === 0) return deleted;
    const outcomes = await Promise.allSettled(
      result.rows.map((row) =>
        getTables().deleteRow({
          databaseId: getDatabaseId(),
          tableId: "notifications",
          rowId: row.$id,
        }),
      ),
    );
    deleted += outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    if (result.rows.length < 100) return deleted;
  }
}

export async function markNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;
  const tables = getTables();
  const databaseId = getDatabaseId();

  // One batched read instead of one getRow per id.
  let owned: NotificationRow[] = [];
  try {
    const result = await tables.listRows<NotificationRow>({
      databaseId,
      tableId: "notifications",
      queries: [
        Query.equal("recipient", userId),
        Query.equal("$id", notificationIds),
        Query.limit(100),
      ],
      total: false,
    });
    owned = result.rows;
  } catch (error) {
    if (!(error instanceof AppwriteException && error.code === 404)) {
      throw error;
    }
  }

  await Promise.all(
    owned
      .filter((row) => !row.read)
      .map((row) =>
        tables.updateRow({
          databaseId,
          tableId: "notifications",
          rowId: row.$id,
          data: { read: true },
        }),
      ),
  );
}
