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
import { suggestBucket, suggestDay, suggestCacheStats, type SuggestMeta } from "@/features/ai/suggest";
import { report, startTiming } from "@/lib/telemetry";

const CACHE_HEADERS = { "Cache-Control": "private, no-store" } as const;

const bucketSchema = z
  .object({ bucket: z.enum(["rise", "midday", "evening"]).optional() })
  .strict();

/** Suggest — grounded in the user's own actions + the check. */
export async function POST(request: Request) {
  const t0 = performance.now();
  const timing = startTiming(t0);

  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Suggest my day");
  timing.lap("auth");
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
    const [row, entries, items] = await Promise.all([
      getUserRow(auth.account.$id),
      listRecentEntriesSince(auth.account.$id, cutoff),
      listTimeline(auth.account.$id),
    ]);
    timing.lap("reads");
    if (!row?.ai) {
      return jsonError(
        403,
        "AI_NOT_ENABLED",
        "Enable Mono AI in Settings first.",
      );
    }
    const actions = (row.actions ?? []).slice(0, 20);
    const timelineTexts = items.map((item) => item.text);
    const finish = (body: object, cached: boolean, meta?: SuggestMeta) => {
      timing.lap("suggest");
      const stats = suggestCacheStats();
      report("/api/ai/suggest", timing, {
        bucket: parsed.data.bucket ?? "day",
        cache: cached ? "hit" : "miss",
        cacheHits: stats.hits,
        cacheMisses: stats.misses,
        ...(meta?.model ? { model: meta.model } : {}),
        ...(meta?.attempts ? { attempts: meta.attempts } : {}),
        ...(meta?.usage
          ? {
              inTokens: meta.usage.promptTokens,
              outTokens: meta.usage.outputTokens,
            }
          : {}),
      });
      return NextResponse.json(body, {
        headers: {
          ...CACHE_HEADERS,
          "Server-Timing": timing.header(),
        },
      });
    };

    if (parsed.data.bucket) {
      const { items, source, cached, meta } = await suggestBucket(
        parsed.data.bucket,
        entries,
        actions,
        timelineTexts,
      );
      return finish({ items, source, cached }, cached, meta);
    }
    const { picks, source, cached, meta } = await suggestDay(entries, actions, timelineTexts);
    return finish({ picks, source, cached }, cached, meta);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    timing.lap("suggest");
    report("/api/ai/suggest", timing, { bucket: parsed.data.bucket ?? "day", error: detail });
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
