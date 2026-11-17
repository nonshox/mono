import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import { listLetterTargets } from "@/features/users/service";
import { listRecentEntries } from "@/features/days/service";
import { sendTelegramNotification } from "@/features/telegram/service";
import { notifyLetterReady } from "@/features/notifications/events";
import { compileLetter } from "@/features/digest/compile";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) {
    return false;
  }

  const received = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    received.byteLength === expected.byteLength &&
    timingSafeEqual(received, expected)
  );
}

/**
 * Fired Sundays 09:00 UTC. Sends the weekly letter (compiled on this server
 * from what the writer actually wrote — no AI, no network beyond Telegram)
 * to users who opted into the letter and wrote this week.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    logFailure("Letter cron", new Error("CRON_SECRET is not configured."));
    return jsonError(503, "CRON_NOT_CONFIGURED", "Cron is not configured.");
  }
  if (!isAuthorized(request)) {
    return jsonError(401, "UNAUTHORIZED", "Not authorized.");
  }

  const todayDate = new Date();
  const weekAgo = new Date(todayDate.getTime() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  let targets: string[];
  try {
    targets = await listLetterTargets();
  } catch (error) {
    logFailure("Letter cron", error);
    return jsonError(502, "LETTER_LOOKUP_FAILED", "Letters are unavailable right now.");
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of targets) {
    try {
      const recent = (await listRecentEntries(userId, 30)).filter(
        (entry) => entry.day >= weekAgo,
      );
      if (recent.length === 0) {
        skipped += 1;
        continue;
      }

      const letter = compileLetter(recent);
      await notifyLetterReady(userId);
      await sendTelegramNotification(userId, letter);
      sent += 1;
    } catch (error) {
      failed += 1;
      logFailure("Letter delivery", error);
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
