import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { satisfySchema } from "@/features/today/schemas";
import { setDaySatisfied, clearDaySatisfied } from "@/features/days/service";
import { todayDay } from "@/features/today/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today satisfy");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to save it.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = satisfySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Pick a number from 0 to 100.");
  }

  try {
    await setDaySatisfied(auth.account.$id, todayDay(), parsed.data.satisfied);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Today satisfy", error);
    return jsonError(502, "SATISFY_FAILED", "That could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today unsatisfy");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in first.");
  }

  try {
    await clearDaySatisfied(auth.account.$id, todayDay());
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Today unsatisfy", error);
    return jsonError(502, "SATISFY_CLEAR_FAILED", "That could not be cleared.");
  }
}
