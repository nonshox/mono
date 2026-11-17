import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { clearTodayTicks as clearTicks } from "@/features/today/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today reset");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to reset.");
  }

  try {
    await clearTicks(auth.account.$id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Today reset", error);
    return jsonError(502, "TODAY_RESET_FAILED", "Reset failed.");
  }
}
