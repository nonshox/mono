import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure } from "@/lib/http";
import { polishEntrySchema } from "@/features/ai/schemas";
import { polishEntry } from "@/features/digest/compile";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Local text tidy for raw dictation — deterministic, no network, no cost.
 * Your words never leave this device.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Dictation polish");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to polish your words.");
  }

  const limited = rateLimit("ai:polish", auth.account.$id, 60, 60_000);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Slowing down — try again in ${limited.retryAfterSeconds}s.`,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = polishEntrySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Write a few more words first.");
  }

  try {
    const polished = polishEntry(parsed.data.text);
    return NextResponse.json(
      { polished },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    logFailure("Dictation polish", error);
    return jsonError(502, "POLISH_UNAVAILABLE", "Polish could not run right now.");
  }
}
