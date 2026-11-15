import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import { listNudgeTargets } from "@/features/users/service";
import { hasDayEntry } from "@/features/days/service";
import { sendTelegramNotification } from "@/features/telegram/service";

const MESSAGE =
  "How was today? Open Mono and stamp a dot — two or three words is enough.";

/** Never prerender or cache — cron only, headers auth. */
export const dynamic = "force-dynamic";

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
 * Fired once daily (20:00 UTC) by Vercel Cron. Nudges opted-in users who
 * haven't written today's dot yet. Best-effort per user — one failure never
 * blocks the rest.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    logFailure("Nudge cron", new Error("CRON_SECRET is not configured."));
    return jsonError(503, "CRON_NOT_CONFIGURED", "Cron is not configured.");
  }
  if (!isAuthorized(request)) {
    return jsonError(401, "UNAUTHORIZED", "Not authorized.");
  }

  const today = new Date().toISOString().slice(0, 10);

  let targets: string[];
  try {
    targets = await listNudgeTargets();
  } catch (error) {
    logFailure("Nudge cron", error);
    return jsonError(502, "NUDGE_LOOKUP_FAILED", "Nudges are unavailable right now.");
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of targets) {
    try {
      if (await hasDayEntry(userId, today)) {
        skipped += 1;
        continue;
      }
      await sendTelegramNotification(userId, MESSAGE);
      sent += 1;
    } catch (error) {
      failed += 1;
      logFailure("Nudge delivery", error);
    }
  }

  return NextResponse.json({ today, sent, skipped, failed });
}
