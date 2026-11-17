import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, getAuthAccount, jsonError, logFailure } from "@/lib/http";
import { listFlashbackEntries } from "@/features/days/service";
import { dayKeySchema } from "@/features/days/schemas";

export async function GET(request: Request) {
  const auth = await getAuthAccount("Flashback lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to look back.");
  }

  const day = new URL(request.url).searchParams.get("day") ?? "";
  const parsed = dayKeySchema.safeParse(day);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Ask for a valid day.");
  }

  try {
    const entries = await listFlashbackEntries(
      auth.account.$id,
      parsed.data.slice(5),
      Number(parsed.data.slice(0, 4)),
    );
    return NextResponse.json(
      { entries },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    logFailure("Flashback lookup", error);
    return jsonError(502, "FLASHBACK_UNAVAILABLE", "The past is unavailable right now.");
  }
}
