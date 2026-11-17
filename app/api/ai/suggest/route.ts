import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { getUserRow } from "@/features/users/service";
import { listRecentEntriesSince } from "@/features/days/service";
import { listTimeline } from "@/features/check/service";
import { suggestBucket, suggestDay } from "@/features/ai/suggest";

const CACHE_HEADERS = { "Cache-Control": "private, no-store" } as const;

const bucketSchema = z
  .object({ bucket: z.enum(["rise", "midday", "evening"]).optional() })
  .strict();

/** Whole milliseconds only — Server-Timing doesn't need fractions. */
const ms = (start: number) => Math.round(performance.now() - start);

/** Suggest — grounded in the user's own actions + the check. */
export async function POST(request: Request) {
  const t0 = performance.now();
  const timing = { auth: 0, reads: 0, suggest: 0 };

  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Suggest my day");
  timing.auth = ms(t0);
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in first.");
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = bucketSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a bucket.");
  }

  try {
    const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    // Every read in one round of parallel calls — nothing waits on anything.
    const readsStart = performance.now();
    const [row, entries, items] = await Promise.all([
      getUserRow(auth.account.$id),
      listRecentEntriesSince(auth.account.$id, cutoff),
      listTimeline(auth.account.$id),
    ]);
    timing.reads = ms(readsStart);
    if (!row?.ai) {
      return jsonError(
        403,
        "AI_NOT_ENABLED",
        "Enable Mono AI in Settings first.",
      );
    }
    const actions = (row.actions ?? []).slice(0, 20);
    const timelineTexts = items.map((item) => item.text);

    if (parsed.data.bucket) {
      const { items, source } = await suggestBucket(
        parsed.data.bucket,
        entries,
        actions,
        timelineTexts,
      );
      return NextResponse.json({ items, source }, { headers: CACHE_HEADERS });
    }
    const { picks, source } = await suggestDay(entries, actions, timelineTexts);
    return NextResponse.json({ picks, source }, { headers: CACHE_HEADERS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logFailure("Suggest my day", error);
    return jsonError(
      502,
      "SUGGEST_UNAVAILABLE",
      process.env.NODE_ENV === "production"
        ? "Suggest is temporarily unavailable — try again in a minute."
        : `Suggest failed: ${detail}`,
    );
  }
}
