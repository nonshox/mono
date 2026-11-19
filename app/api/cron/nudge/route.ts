import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import { listNudgeTargets } from "@/features/users/service";
import { hasDayEntry, listRecentEntries } from "@/features/days/service";
import { sendTelegramNotification } from "@/features/telegram/service";
import { createNotification } from "@/features/notifications/service";
import { nudgeQuestionFor } from "@/features/digest/compile";
import { userDay } from "@/lib/dates";

// One soft evening line — written for the 10:00pm minute it lands.
const FALLBACK_MESSAGE =
  "The day's almost gone — what happened? Open Mono and stamp it with a line.";

const NUDGE_LOCAL_HOUR = 22; // 10:00pm local

// Shown in the bell when the nudge lands. Kept short enough to read at a glance.
const BELL_BODY = "The day's almost gone — one line before it closes?";

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

function localHour(now: Date, timeZone: string | null): number | null {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: timeZone ?? "UTC",
      }).format(now),
    );
    return Number.isNaN(hour) ? null : hour;
  } catch {
    return null;
  }
}

/**
 * Fired by GitHub Actions hourly at :00 (vercel.json must stay empty —
 * Hobby only allows daily crons). For each opted-in user, nudges them at their
 * LOCAL 10:00pm (stored IANA timezone; falls back to UTC when missing) who
 * haven't written today. Delivers to Telegram AND the in-app bell. Best-effort
 * per user — one failure never blocks the rest.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    logFailure("Nudge cron", new Error("CRON_SECRET is not configured."));
    return jsonError(503, "CRON_NOT_CONFIGURED", "Cron is not configured.");
  }
  if (!isAuthorized(request)) {
    return jsonError(401, "UNAUTHORIZED", "Not authorized.");
  }

  const now = new Date();
  const seed = Math.floor(now.getTime() / 86_400_000);

  let targets: Array<{ id: string; tz: string | null }>;
  try {
    targets = await listNudgeTargets();
  } catch (error) {
    logFailure("Nudge cron", error);
    return jsonError(502, "NUDGE_LOOKUP_FAILED", "Nudges are unavailable right now.");
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      const hour = localHour(now, target.tz);
      if (hour === null) {
        logFailure("Nudge tz", new Error(`Invalid timezone for user ${target.id}`));
        continue;
      }
      if (hour !== NUDGE_LOCAL_HOUR) {
        continue; // Their 10:00pm hasn't arrived — the next hourly ping will catch it.
      }
      // The user's local day decides whether they already wrote today.
      const today = userDay(target.tz, now);
      if (await hasDayEntry(target.id, today)) {
        skipped += 1;
        continue;
      }

      let message = FALLBACK_MESSAGE;
      try {
        const recent = await listRecentEntries(target.id, 7, target.tz);
        message = nudgeQuestionFor(recent, seed);
      } catch (error) {
        // Best-effort contextual line — fall back to the generic one.
        logFailure("Nudge prompt", error);
      }

      // Bell goes regardless of Telegram outcome — a soft 10:00pm marker.
      try {
        await createNotification(target.id, "day_ending", BELL_BODY, "/check");
      } catch (error) {
        logFailure("Nudge bell", error);
      }

      await sendTelegramNotification(target.id, message);
      sent += 1;
    } catch (error) {
      failed += 1;
      logFailure("Nudge delivery", error);
    }
  }

  return NextResponse.json({
    now: now.toISOString(),
    sent,
    skipped,
    failed,
    checked: targets.length,
  });
}
