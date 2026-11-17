import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { listRecentEntriesSince } from "@/features/days/service";
import { listTimeline } from "@/features/check/service";
import { rateLimit } from "@/lib/rate-limit";
import { detectActions } from "@/features/ai/actions";

const CACHE_HEADERS = { "Cache-Control": "private, no-store" } as const;
const WINDOW_DAYS = 10;

export type SuggestActionsStats = {
  /** Day entries with actual text inside the window. */
  entries: number;
  /** Check items included in the scan, counted as today's context. */
  timelineItems: number;
  windowDays: number;
};

/** Scan the last ~10 days for activities the user is working on — local only. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Suggest my actions");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in first.");
  }

  const limited = rateLimit("ai:suggest-actions", auth.account.$id, 30, 60_000);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Slowing down — try again in ${limited.retryAfterSeconds}s.`,
    );
  }

  try {
    const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Only the window we need — never the whole table. Fresh every call.
    const [recent, items] = await Promise.all([
      listRecentEntriesSince(auth.account.$id, cutoff),
      listTimeline(auth.account.$id),
    ]);

    const written = recent.filter((entry) => entry.text.trim().length > 0);
    const timelineTexts = items
      .map((item) => item.text.trim())
      .filter((text) => text.length > 0);
    const pseudoEntries = timelineTexts.map((text) => ({
      day: "check",
      text,
      satisfied: null,
    }));

    const actions = detectActions([...written, ...pseudoEntries], 12).map(
      (a) => a.phrase,
    );
    const stats: SuggestActionsStats = {
      entries: written.length,
      timelineItems: pseudoEntries.length,
      windowDays: WINDOW_DAYS,
    };
    return NextResponse.json({ actions, stats }, { headers: CACHE_HEADERS });
  } catch (error) {
    logFailure("Suggest my actions", error);
    return jsonError(
      502,
      "SUGGEST_ACTIONS_UNAVAILABLE",
      "Scanning is unavailable — try again in a minute.",
    );
  }
}
