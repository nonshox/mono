import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthAccount, jsonError, logFailure } from "@/lib/http";
import { searchDayEntries } from "@/features/days/service";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const auth = await getAuthAccount("Day search");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to search your days.");
  }

  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ entries: [] });
  }

  try {
    const entries = await searchDayEntries(auth.account.$id, parsed.data);
    return NextResponse.json(
      { entries },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Day search", error);
    return jsonError(502, "SEARCH_UNAVAILABLE", "Search is unavailable right now.");
  }
}
