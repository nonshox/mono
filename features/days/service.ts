import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";

const tableId = "days";

export type DayRow = Models.Row & {
  user: string;
  day: string;
  text: string;
};

export type DayEntry = {
  day: string;
  text: string;
};

/** Deterministic row id — one row per user per day, upsertable by id. */
export function dayRowId(userId: string, day: string): string {
  return createHash("sha256").update(`${userId}:${day}`).digest("hex").slice(0, 32);
}

export async function listYearEntries(
  userId: string,
  year: number,
): Promise<DayEntry[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.greaterThanEqual("day", `${year}-01-01`),
      Query.lessThanEqual("day", `${year}-12-31`),
      Query.select(["day", "text"]),
      Query.limit(400),
    ],
    total: false,
  });
  return result.rows.map((row) => ({ day: row.day, text: row.text }));
}

export async function upsertDayEntry(
  userId: string,
  day: string,
  text: string,
): Promise<DayEntry> {
  const tables = getTables();
  const databaseId = getDatabaseId();
  const rowId = dayRowId(userId, day);

  try {
    await tables.getRow({ databaseId, tableId, rowId });
    await tables.updateRow<DayRow>({
      databaseId,
      tableId,
      rowId,
      data: { text },
    });
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    try {
      await tables.createRow<DayRow>({
        databaseId,
        tableId,
        rowId,
        permissions: [],
        data: { user: userId, day, text },
      });
    } catch (createError) {
      // Lost a race with a parallel upsert — treat as update.
      if (createError instanceof AppwriteException && createError.code === 409) {
        await tables.updateRow<DayRow>({
          databaseId,
          tableId,
          rowId,
          data: { text },
        });
      } else {
        throw createError;
      }
    }
  }

  return { day, text };
}

/** Idempotent — missing rows are a no-op so clients can retry safely. */
export async function deleteDayEntry(userId: string, day: string): Promise<void> {
  try {
    await getTables().deleteRow({
      databaseId: getDatabaseId(),
      tableId,
      rowId: dayRowId(userId, day),
    });
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

export async function hasDayEntry(userId: string, day: string): Promise<boolean> {
  try {
    await getTables().getRow({
      databaseId: getDatabaseId(),
      tableId,
      rowId: dayRowId(userId, day),
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

/** Distinct years that contain at least one entry, ascending. */
export async function listYearsWithEntries(
  userId: string,
): Promise<number[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.select(["day"]),
      Query.limit(5000),
    ],
    total: false,
  });
  return [
    ...new Set(result.rows.map((row) => Number(row.day.slice(0, 4)))),
  ].sort((a, b) => a - b);
}

/** Substring search across every year, newest first. Max 20 rows. */
export async function searchDayEntries(
  userId: string,
  query: string,
): Promise<DayEntry[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.contains("text", query),
      Query.select(["day", "text"]),
      Query.limit(50),
    ],
    total: false,
  });
  return result.rows
    .map((row) => ({ day: row.day, text: row.text }))
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 20);
}

/**
 * Same month-day in earlier years, newest first. `excludeYear` keeps the
 * currently-viewed year out of the list. At most 3 entries.
 */
export async function listFlashbackEntries(
  userId: string,
  monthDay: string,
  excludeYear: number,
): Promise<DayEntry[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.contains("day", `-${monthDay}`),
      Query.select(["day", "text"]),
      Query.limit(25),
    ],
    total: false,
  });
  return result.rows
    .map((row) => ({ day: row.day, text: row.text }))
    .filter((entry) => Number(entry.day.slice(0, 4)) !== excludeYear)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 3);
}
