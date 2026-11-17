import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import { listNudgeTargets } from "@/features/users/service";
import { hasDayEntry, listRecentEntries } from "@/features/days/service";
import { sendTelegramNotification } from "@/features/telegram/service";
import { nudgeQuestionFor } from "@/features/digest/compile";

const FALLBACK_MESSAGE =
  "How was today? Open Mono and stamp a dot — two or three words is enough.";

const NUDGE_LOCAL_HOUR = 20;

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
 * Fired hourly by Vercel Cron. For each opted-in user, nudges them at their
 * LOCAL 8pm (stored IANA timezone; falls back to 20:00 UTC) who haven't
 * written today. Best-effort per user — one failure never blocks the rest.
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
  const today = now.toISOString().slice(0, 10);
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
        continue; // Their evening hasn't arrived — the hourly cron will call again.
      }
      if (await hasDayEntry(target.id, today)) {
        skipped += 1;
        continue;
      }

      let message = FALLBACK_MESSAGE;
      try {
        const recent = await listRecentEntries(target.id, 7);
        message = nudgeQuestionFor(recent, seed);
      } catch (error) {
        // Best-effort contextual line — fall back to the generic one.
        logFailure("Nudge prompt", error);
      }

      await sendTelegramNotification(target.id, message);
      sent += 1;
    } catch (error) {
      failed += 1;
      logFailure("Nudge delivery", error);
    }
  }

  return NextResponse.json({ today, sent, skipped, failed, checked: targets.length });
}
