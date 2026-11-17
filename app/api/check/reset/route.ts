import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { clearCheckTicks as clearTicks } from "@/features/check/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Check reset");
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
    logFailure("Check reset", error);
    return jsonError(502, "CHECK_RESET_FAILED", "Reset failed.");
  }
}
