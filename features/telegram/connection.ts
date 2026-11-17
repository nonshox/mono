import "server-only";

import { AppwriteException, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables } from "@/lib/appwrite/tables";

export type TelegramTokenRow = Models.Row & {
  user: string;
  hash: string;
  expires: string;
  used: boolean;
};

export type TelegramConnectionRow = Models.Row & {
  user: string;
  member: string;
  chat: string;
  created: string;
};

export class TelegramDeliveryError extends Error {
  constructor(readonly status: number) {
    super(`Telegram responded with HTTP ${status}.`);
    this.name = "TelegramDeliveryError";
  }
}

/**
 * Deletes every used or expired one-time link code. Best-effort; never throws.
 * Called on every link creation/consumption so the table can't accumulate dead rows.
 */
export async function pruneCodes(): Promise<number> {
  const nowIso = new Date().toISOString();
  let deleted = 0;
  const tables = getTables();
  const databaseId = getDatabaseId();

  for (const queries of [
    [Query.equal("used", true)],
    [Query.lessThan("expires", nowIso)],
  ]) {
    for (;;) {
      const page = await tables.listRows({
        databaseId,
        tableId: "codes",
        queries: [...queries, Query.limit(100), Query.select(["$id"])],
        total: false,
      });
      if (page.rows.length === 0) break;
      await Promise.allSettled(
        page.rows.map((row) =>
          tables.deleteRow({ databaseId, tableId: "codes", rowId: row.$id }),
        ),
      );
      deleted += page.rows.length;
      if (page.rows.length < 100) break;
    }
  }
  return deleted;
}

/** Resolve a connection by its `user` or `member` key, or null when unlinked. */
export async function findTelegramConnection(
  key: "user" | "member",
  value: string,
): Promise<TelegramConnectionRow | null> {
  const result = await getTables().listRows<TelegramConnectionRow>({
    databaseId: getDatabaseId(),
    tableId: "telegram",
    queries: [Query.equal(key, value), Query.limit(1)],
    total: false,
  });
  return result.rows[0] ?? null;
}

/** The user's one-time link code row, or null when they never started a link. */
export async function getTelegramTokenByUser(
  userId: string,
): Promise<TelegramTokenRow | null> {
  try {
    return await getTables().getRow<TelegramTokenRow>({
      databaseId: getDatabaseId(),
      tableId: "codes",
      rowId: userId,
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      return null;
    }
    throw error;
  }
}
