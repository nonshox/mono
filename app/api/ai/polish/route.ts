import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { polishEntrySchema } from "@/features/ai/schemas";
import { getUserRow } from "@/features/users/service";
import { polishEntry } from "@/features/ai/generate";

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
    const row = await getUserRow(auth.account.$id);
    if (!row?.ai) {
      return jsonError(403, "AI_NOT_ENABLED", "Enable Mono AI in Settings first.");
    }

    const polished = await polishEntry(parsed.data.text);
    return NextResponse.json(
      { polished },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Dictation polish", error);
    return jsonError(502, "POLISH_UNAVAILABLE", "Polish could not run right now.");
  }
}
