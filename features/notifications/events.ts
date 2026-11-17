import "server-only";
import { after } from "next/server";
import { logFailure } from "@/lib/http";
import { listRecentEntriesSince } from "@/features/days/service";
import {
  createNotification,
  type NotificationKind,
} from "./service";

async function safeCreate(
  userId: string,
  kind: NotificationKind,
  body: string,
  ref: string,
): Promise<void> {
  try {
    await createNotification(userId, kind, body, ref);
  } catch (error) {
    logFailure(`Notify ${kind}`, error);
  }
}

/**
 * End-of-day event: the user just closed today with `percent`. Runs after the
 * response so saving the day is never blocked by notification work.
 *
 * `previousSatisfied` must be the value read before this write — milestones
 * only fire on the first close of the day, so re-adjusting the percent never
 * repeats them.
 */
export function notifyDayClosed(
  userId: string,
  today: string,
  percent: number,
  previousSatisfied: number | null,
): void {
  if (previousSatisfied !== null) {
    return;
  }
  after(async () => {
    await safeCreate(
      userId,
      "dot_closed",
      `Day closed at ${percent}%. A dot joined your year.`,
      "/",
    );
    const streak = await currentSatisfiedStreak(userId, today);
    if (streak === 7) {
      await safeCreate(userId, "streak_7", "7 days closed in a row.", "/");
    } else if (streak === 30) {
      await safeCreate(userId, "streak_30", "30 days closed in a row.", "/");
    }
  });
}

/** Weekly letter event: fired by the letter cron after compiling a letter. */
export async function notifyLetterReady(userId: string): Promise<void> {
  await safeCreate(
    userId,
    "letter_ready",
    "Your weekly letter is ready.",
    "/journal",
  );
}

/** Consecutive days with satisfaction set, ending on `today` (inclusive). */
async function currentSatisfiedStreak(
  userId: string,
  today: string,
): Promise<number> {
  try {
    const from = new Date(`${today}T00:00:00.000Z`);
    from.setUTCDate(from.getUTCDate() - 45);
    const iso = from.toISOString().slice(0, 10);
    const entries = await listRecentEntriesSince(userId, iso);
    const closed = new Set(
      entries
        .filter((entry) => entry.satisfied != null)
        .map((entry) => entry.day),
    );
    let streak = 0;
    const cursor = new Date(`${today}T00:00:00.000Z`);
    for (;;) {
      const day = cursor.toISOString().slice(0, 10);
      if (!closed.has(day)) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  } catch (error) {
    logFailure("Streak check", error);
    return 0;
  }
}
