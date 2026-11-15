import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import { listAiTargets, listNudgeTargets } from "@/features/users/service";
import { hasDayEntry, listRecentEntries } from "@/features/days/service";
import { sendTelegramNotification } from "@/features/telegram/service";
import { generateNudgeQuestion } from "@/features/ai/generate";

const FALLBACK_MESSAGE =
  "How was today? Open Mono and stamp a dot — two or three words is enough.";

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
  let aiTargets: Set<string>;
  try {
    [targets, aiTargets] = await Promise.all([
      listNudgeTargets(),
      listAiTargets().then((ids) => new Set(ids)),
    ]);
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

      let message = FALLBACK_MESSAGE;
      if (aiTargets.has(userId)) {
        try {
          const question = await generateNudgeQuestion(
            await listRecentEntries(userId, 7),
          );
          if (question) {
            message = `How was today? ${question}`;
          }
        } catch (error) {
          // AI is best-effort — fall back to the generic line.
          logFailure("Nudge prompt", error);
        }
      }

      await sendTelegramNotification(userId, message);
      sent += 1;
    } catch (error) {
      failed += 1;
      logFailure("Nudge delivery", error);
    }
  }

  return NextResponse.json({ today, sent, skipped, failed });
}
