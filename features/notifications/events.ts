import "server-only";
import { after } from "next/server";
import { logFailure } from "@/lib/http";
import {
  createNotification,
  type NotificationKind,
} from "./service";

async function safeCreate(
  userId: string,
  kind: NotificationKind,
  body: string,
  ref?: string,
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
 * `previousSatisfied` must be the value read before this write — the only
 * notification fires on the first close of the day, so re-adjusting the
 * percent never repeats it.
 */
export function notifyDayClosed(
  userId: string,
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
