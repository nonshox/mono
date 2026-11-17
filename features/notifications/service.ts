import "server-only";
import { ID, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import { logFailure } from "@/lib/http";
import type { NotificationItem, NotificationKind } from "./types";

export type { NotificationItem, NotificationKind } from "./types";

export const notificationsTableId = "notifications" as const;

export type NotificationRow = Models.Row & {
  user: string;
  kind: NotificationKind;
  body: string;
  read: boolean;
};

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  try {
    const result = await getTables().listRows<NotificationRow>({
      databaseId: getDatabaseId(),
      tableId: notificationsTableId,
      queries: [Query.equal("user", userId), Query.limit(500)],
      total: false,
    });
    return result.rows
      .map((row) => ({
        id: row.$id,
        kind: row.kind,
        body: row.body,
        createdAt: row.$createdAt,
        read: row.read,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  } catch (error) {
    logFailure("Notifications list", error);
    return [];
  }
}

/** Mark one notification read — no-op unless the row belongs to `userId`. */
/** Cheap unread count — one indexed query, id-only rows (~1 KB worst case). */
export async function countUnreadNotifications(userId: string): Promise<number> {
  try {
    const result = await getTables().listRows<NotificationRow>({
      databaseId: getDatabaseId(),
      tableId: notificationsTableId,
      queries: [
        Query.equal("user", userId),
        Query.equal("read", false),
        Query.select(["$id"]),
        Query.limit(100),
      ],
      total: false,
    });
    return result.rows.length;
  } catch (error) {
    logFailure("Unread notification count", error);
    return 0;
  }
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  let row: NotificationRow;
  try {
    row = await getTables().getRow<NotificationRow>({
      databaseId: getDatabaseId(),
      tableId: notificationsTableId,
      rowId: notificationId,
    });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }
  if (row.user !== userId) {
    return;
  }
  await getTables().updateRow<NotificationRow>({
    databaseId: getDatabaseId(),
    tableId: notificationsTableId,
    rowId: notificationId,
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const result = await getTables().listRows<NotificationRow>({
    databaseId: getDatabaseId(),
    tableId: notificationsTableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("read", false),
      Query.select(["$id"]),
      Query.limit(200),
    ],
    total: false,
  });
  await Promise.all(
    result.rows.map((row) =>
      getTables().updateRow<NotificationRow>({
        databaseId: getDatabaseId(),
        tableId: notificationsTableId,
        rowId: row.$id,
        data: { read: true },
      }),
    ),
  );
}

export async function clearReadNotifications(userId: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const result = await getTables().listRows<NotificationRow>({
      databaseId: getDatabaseId(),
      tableId: notificationsTableId,
      queries: [
        Query.equal("user", userId),
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
          tableId: notificationsTableId,
          rowId: row.$id,
        }),
      ),
    );
    deleted += outcomes.filter((o) => o.status === "fulfilled").length;
    if (result.rows.length < 100) return deleted;
  }
}

/** Create one system event for a user. No recipient checks — the caller owns it. */
export async function createNotification(
  userId: string,
  kind: NotificationKind,
  body: string,
): Promise<void> {
  await getTables().createRow({
    databaseId: getDatabaseId(),
    tableId: notificationsTableId,
    rowId: ID.unique(),
    permissions: [],
    data: { user: userId, kind, body, read: false },
  });
}
