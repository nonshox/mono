import "server-only";
import { AppwriteException, Query, Users, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import { logFailure } from "@/lib/http";
import { deleteAvatarFile } from "@/features/users/avatar";

const tableId = "users";

export type UserRow = Models.Row & {
  email: string;
  name: string;
  avatar?: string;
  /** Opt-in for the daily evening Telegram nudge. */
  nudge?: boolean;
  /** Opt-in for the weekly Telegram letter. */
  ai?: boolean;
  /** IANA timezone (e.g. "America/New_York") — drives the evening nudge hour. */
  tz?: string | null;
  /** Things the user is actively doing — edited in profile; feeds suggestions. */
  actions?: string[] | null;
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

/** Store (or clear, with null) the avatar file id; removes the replaced file. */
export async function setUserAvatar(
  userId: string,
  fileId: string | null,
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }
  const previous = existing.avatar?.trim() ? existing.avatar : null;
  const updated = await getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { avatar: fileId ?? "" },
  });
  await deleteAvatarFile(previous);
  return updated;
}

export async function setUserActions(
  userId: string,
  actions: string[],
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }
  const cleaned = [
    ...new Set(
      actions
        .map((action) => action.trim())
        .filter((action) => action.length >= 2 && action.length <= 64),
    ),
  ].slice(0, 20);
  return getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { actions: cleaned },
  });
}

export async function setUserTz(
  userId: string,
  tz: string,
): Promise<UserRow> {
  const existing = await getUserRow(userId);
  if (!existing) {
    throw new Error("Users row is missing for this account.");
  }

  return getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { tz },
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

/** Account ids opted into the weekly letter; used by the letter cron route. */
export async function listLetterTargets(): Promise<string[]> {
  const result = await getTables().listRows<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [Query.equal("ai", true), Query.select(["$id"]), Query.limit(500)],
    total: false,
  });
  return result.rows.map((row) => row.$id);
}

/** Account ids opted into the evening nudge (with stored timezone); used by the cron endpoint. */
export async function listNudgeTargets(): Promise<Array<{ id: string; tz: string | null }>> {
  const result = await getTables().listRows<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("nudge", true),
      Query.select(["$id", "tz"]),
      Query.limit(500),
    ],
    total: false,
  });
  return result.rows.map((row) => ({ id: row.$id, tz: row.tz ?? null }));
}

/**
 * Best-effort erasure of everything mono stores about an account, then the
 * Appwrite account itself. Each step is independent; failures are logged and
 * don't abort the deletion of the rest.
 */
export async function deleteUserEverywhere(userId: string): Promise<void> {
  const tables = getTables();
  const databaseId = getDatabaseId();

  // Avatar storage file, if any — remove before wiping the user row.
  const row = await getUserRow(userId).catch(() => null);
  await deleteAvatarFile(row?.avatar);

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

  // Wipe every row this user owns — notifications carry `user`, not the old
  // actor-based recipient/actor pair, so the delete uses the live key.
  await Promise.allSettled([
    wipe("notifications", "user"),
    wipe("telegram", "user"),
    wipe("codes", "user"),
    wipe("days", "user"),
    wipe("timeline", "user"),
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
