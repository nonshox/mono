import "server-only";
import { AppwriteException, Query, Users, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import { logFailure } from "@/lib/http";

const tableId = "users";

export type UserRow = Models.Row & {
  email: string;
  name: string;
  avatar?: string;
  /** Opt-in for the daily evening Telegram nudge. */
  nudge?: boolean;
  /** Opt-in for Mono AI (entries sent to Google Gemini). */
  ai?: boolean;
};

export type UserPreview = Models.Row & {
  name: string;
  avatar?: string;
};

export async function getUserRow(userId: string): Promise<UserRow | null> {
  try {
    return await getTables().getRow<UserRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: userId,
    });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Guarantees a users row exists for the account. Safe to call on every
 * sign-in; email drift (changed in Appwrite, stale in the row) is repaired.
 */
export async function ensureUserForAccount(
  userId: string,
  email: string,
): Promise<UserRow> {
  const existing = await getUserRow(userId);

  if (existing) {
    if (existing.email !== email) {
      return getTables().updateRow<UserRow>({
        databaseId: getDatabaseId(),
        tableId,
        rowId: userId,
        data: { email },
      });
    }
    return existing;
  }

  try {
    return await getTables().createRow<UserRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: userId,
      permissions: [],
      data: { email, name: "" },
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      const createdByAnotherRequest = await getUserRow(userId);
      if (createdByAnotherRequest) {
        return createdByAnotherRequest;
      }
    }
    throw error;
  }
}

export async function updateUserName(
  userId: string,
  name: string,
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }

  return getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { name },
  });
}

export async function setUserNudge(
  userId: string,
  nudge: boolean,
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }

  return getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { nudge },
  });
}

export async function setUserAi(
  userId: string,
  ai: boolean,
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }

  return getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { ai },
  });
}

/** Account ids opted into Mono AI; used by the AI cron routes. */
export async function listAiTargets(): Promise<string[]> {
  const result = await getTables().listRows<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [Query.equal("ai", true), Query.select(["$id"]), Query.limit(500)],
    total: false,
  });
  return result.rows.map((row) => row.$id);
}

/** Account ids opted into the daily nudge; used by the cron endpoint. */
export async function listNudgeTargets(): Promise<string[]> {
  const result = await getTables().listRows<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("nudge", true),
      Query.select(["$id"]),
      Query.limit(500),
    ],
    total: false,
  });
  return result.rows.map((row) => row.$id);
}

/** Lightweight lookup used by other features (e.g. notification actors). */
export async function getUsersByIds(
  ids: string[],
): Promise<Map<string, UserPreview>> {
  if (ids.length === 0) {
    return new Map();
  }
  const result = await getTables().listRows<UserPreview>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("$id", ids),
      Query.limit(100),
      Query.select(["$id", "name", "avatar"]),
    ],
    total: false,
  });
  return new Map(result.rows.map((row) => [row.$id, row]));
}

/**
 * Best-effort erasure of everything mono stores about an account, then the
 * Appwrite account itself. Each step is independent; failures are logged and
 * don't abort the deletion of the rest.
 */
export async function deleteUserEverywhere(userId: string): Promise<void> {
  const tables = getTables();
  const databaseId = getDatabaseId();

  const wipe = async (table: string, column: string) => {
    for (;;) {
      const batch = await tables.listRows({
        databaseId,
        tableId: table,
        queries: [Query.equal(column, userId), Query.limit(100), Query.select(["$id"])],
        total: false,
      });
      if (batch.rows.length === 0) return;
      await Promise.allSettled(
        batch.rows.map((row) =>
          tables.deleteRow({ databaseId, tableId: table, rowId: row.$id }),
        ),
      );
      if (batch.rows.length < 100) return;
    }
  };

  await Promise.allSettled([
    wipe("notifications", "recipient"),
    wipe("notifications", "actor"),
    wipe("telegram", "user"),
    wipe("codes", "user"),
    wipe("days", "user"),
    wipe("tasks", "user"),
  ]);
  await tables
    .deleteRow({ databaseId, tableId, rowId: userId })
    .catch((error) => logFailure("Delete user row", error));

  try {
    const users = new Users(createAdminClient());
    await users.delete(userId);
  } catch (error) {
    logFailure("Delete auth account", error);
    throw error;
  }
}
