import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { listRecentEntriesSince } from "@/features/days/service";
import { compileLetter } from "@/features/digest/compile";
import { rateLimit } from "@/lib/rate-limit";

/** Your week, on demand — the same letter the Telegram cron sends. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Week letter");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to compile your week.");
  }

  const limited = rateLimit("ai:letter", auth.account.$id, 20, 60_000);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Slowing down — try again in ${limited.retryAfterSeconds}s.`,
    );
  }

  try {
    // Trailing 7 days, ascending — crosses the year boundary safely.
    const weekAgo = new Date(Date.now() - 6 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const week = await listRecentEntriesSince(auth.account.$id, weekAgo);
    if (week.length === 0) {
      return jsonError(
        400,
        "NOT_ENOUGH_WRITTEN",
        "Write a few lines this week before your letter means something.",
      );
    }

    const letter = compileLetter(week, true);
    return NextResponse.json({ letter });
  } catch (error) {
    logFailure("Week letter", error);
    return jsonError(
      502,
      "LETTER_UNAVAILABLE",
      "Your week could not be compiled right now.",
    );
  }
}
