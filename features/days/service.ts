import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";

const tableId = "days";

export type DayRow = Models.Row & {
  user: string;
  day: string;
  text: string;
  satisfied?: number | null;
};

export type DayEntry = {
  day: string;
  text: string;
  /** End-of-day satisfaction percent (0–100), null if not set for that day. */
  satisfied?: number | null;
};

/** Read satisfied for a specific day; null if no row / no value set. */
export async function getDaySatisfied(
  userId: string,
  day: string,
): Promise<number | null> {
  const rowId = dayRowId(userId, day);
  try {
    const row = await getTables().getRow<DayRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId,
    });
    return row.satisfied ?? null;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

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
      Query.select(["day", "text", "satisfied"]),
      Query.orderAsc("day"),
      Query.limit(400),
    ],
    total: false,
  });
  return result.rows.map((row) => ({ day: row.day, text: row.text, satisfied: row.satisfied ?? null }));
}

/** Append one line to the day's entry (creates the entry if absent). */
export async function appendToDay(
  userId: string,
  day: string,
  text: string,
): Promise<{ day: string; text: string; length: number }> {
  const rowId = dayRowId(userId, day);
  const tables = getTables();
  const databaseId = getDatabaseId();

  let existingText: string | null = null;
  try {
    const row = await tables.getRow<DayRow>({ databaseId, tableId, rowId });
    existingText = row.text;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  const combined = existingText ? `${existingText}\n${text}` : text;
  if (combined.length > 1000) {
    throw new Error("today's entry is full (1000 chars)");
  }

  if (existingText === null) {
    await upsertDayEntry(userId, day, combined);
  } else {
    await tables.updateRow<DayRow>({
      databaseId,
      tableId,
      rowId,
      data: { text: combined },
    });
  }
  return { day, text: combined, length: combined.length };
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

/** Only entries on or after `isoDay` (inclusive), ascending. Cheap. */
export async function listRecentEntriesSince(
  userId: string,
  isoDay: string,
): Promise<DayEntry[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.greaterThanEqual("day", isoDay),
      Query.select(["day", "text", "satisfied"]),
      Query.orderAsc("day"),
      Query.limit(1000),
    ],
    total: false,
  });
  return result.rows.map((row) => ({
    day: row.day,
    text: row.text,
    satisfied: row.satisfied ?? null,
  }));
}

/** The last `limit` entries of the current year, ascending by day. */
export async function listRecentEntries(
  userId: string,
  limit = 7,
): Promise<DayEntry[]> {
  const year = new Date().getUTCFullYear();
  const entries = await listYearEntries(userId, year);
  return entries.slice(-limit);
}

/** Every entry the user has, ascending by day. Caps at 5000 rows. */
export async function listAllEntries(
  userId: string,
): Promise<DayEntry[]> {
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.select(["day", "text", "satisfied"]),
      Query.orderAsc("day"),
      Query.limit(5000),
    ],
    total: false,
  });
  return result.rows.map((row) => ({
    day: row.day,
    text: row.text,
    satisfied: row.satisfied ?? null,
  }));
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
      Query.orderAsc("day"),
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
      Query.select(["day", "text", "satisfied"]),
      Query.orderDesc("day"),
      Query.limit(20),
    ],
    total: false,
  });
  return result.rows.map((row) => ({
    day: row.day,
    text: row.text,
    satisfied: row.satisfied ?? null,
  }));
}

/** Write end-of-day satisfaction percent onto the day row (creates it if absent). */
export async function setDaySatisfied(
  userId: string,
  day: string,
  satisfied: number,
): Promise<void> {
  const tables = getTables();
  const databaseId = getDatabaseId();
  const rowId = dayRowId(userId, day);

  try {
    await tables.updateRow<DayRow>({
      databaseId,
      tableId,
      rowId,
      data: { satisfied },
    });
    return;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  await tables.createRow<DayRow>({
    databaseId,
    tableId,
    rowId,
    permissions: [],
    data: { user: userId, day, text: "", satisfied },
  });
}

/** Clear end-of-day satisfaction for a day (used when user says "no"). */
export async function clearDaySatisfied(
  userId: string,
  day: string,
): Promise<void> {
  const rowId = dayRowId(userId, day);
  try {
    await getTables().updateRow({
      databaseId: getDatabaseId(),
      tableId,
      rowId,
      data: { satisfied: null },
    });
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}
/**
 * Same month-day in earlier years, newest first. `excludeYear` keeps the
 * currently-viewed year out of the list. At most 3 entries. Uses exact-day
 * matches (ISO strings), so no full-text query is needed.
 */
export async function listFlashbackEntries(
  userId: string,
  monthDay: string,
  excludeYear: number,
): Promise<DayEntry[]> {
  const years = new Set<number>();
  for (let offset = 1; offset <= 10; offset += 1) {
    years.add(excludeYear - offset);
  }
  const days = [...years].map((year) => `${year}-${monthDay}`);
  const result = await getTables().listRows<DayRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("day", days),
      Query.select(["day", "text", "satisfied"]),
      Query.orderDesc("day"),
      Query.limit(25),
    ],
    total: false,
  });
  return result.rows
    .map((row) => ({ day: row.day, text: row.text, satisfied: row.satisfied ?? null }))
    .slice(0, 3);
}
