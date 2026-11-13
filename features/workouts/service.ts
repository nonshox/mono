import "server-only";
import { ID, Query } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import type { WorkoutRow, WorkoutSummary } from "./types";
import type { createWorkoutSchema } from "./schemas";
import type { z } from "zod";

const tableId = "workouts";

export async function createWorkout(
  userId: string,
  input: z.infer<typeof createWorkoutSchema>,
): Promise<void> {
  await getTables().createRow<WorkoutRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: ID.unique(),
    permissions: [],
    data: { user: userId, ...input },
  });
}

export type StoredSession = {
  id: string;
  kind: string;
  reps: number;
  duration: number;
  score: number | null;
  createdAt: string;
};

/** Most recent sessions, newest first. */
export async function getRecentWorkouts(
  userId: string,
  limit = 5,
): Promise<StoredSession[]> {
  try {
    const result = await getTables().listRows<WorkoutRow>({
      databaseId: getDatabaseId(),
      tableId,
      queries: [
        Query.equal("user", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(Math.min(limit, 50)),
      ],
      total: false,
    });
    return result.rows.map((row) => ({
      id: row.$id,
      kind: row.kind,
      reps: row.reps,
      duration: row.duration,
      score: row.score ?? null,
      createdAt: row.$createdAt,
    }));
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * Totals + current streak (consecutive days with at least one session).
 * Scans the most recent 200 rows — plenty for a streak.
 */
export async function getWorkoutSummary(userId: string): Promise<WorkoutSummary> {
  let rows: WorkoutRow[];
  try {
    const result = await getTables().listRows<WorkoutRow>({
      databaseId: getDatabaseId(),
      tableId,
      queries: [
        Query.equal("user", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
        Query.select(["$id", "$createdAt", "reps"]),
      ],
      total: false,
    });
    rows = result.rows;
  } catch (error) {
    if (isNotFound(error)) {
      return { sessions: 0, totalReps: 0, bestSet: 0, streak: 0 };
    }
    throw error;
  }

  const sessions = rows.length;
  const totalReps = rows.reduce((sum, row) => sum + row.reps, 0);
  const bestSet = rows.reduce((best, row) => Math.max(best, row.reps), 0);

  const days = new Set(
    rows.map((row) => new Date(row.$createdAt).toISOString().slice(0, 10)),
  );
  let streak = 0;
  for (let offset = 0; ; offset += 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - offset);
    if (days.has(day.toISOString().slice(0, 10))) {
      streak += 1;
    } else if (offset === 0) {
      // A session today isn't required to hold a streak that's still "alive".
      continue;
    } else {
      break;
    }
  }

  return { sessions, totalReps, bestSet, streak };
}
