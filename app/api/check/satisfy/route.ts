import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { satisfySchema } from "@/features/check/schemas";
import { getDaySatisfied, setDaySatisfied, clearDaySatisfied } from "@/features/days/service";
import { todayDay } from "@/features/check/satisfy";
import { notifyDayClosed } from "@/features/notifications/events";
import { getUserRow } from "@/features/users/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Check satisfy");
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
    const user = await getUserRow(auth.account.$id).catch(() => null);
    const day = todayDay(user?.tz ?? null);
    const previousSatisfied = await getDaySatisfied(auth.account.$id, day);
    await setDaySatisfied(auth.account.$id, day, parsed.data.satisfied);
    notifyDayClosed(auth.account.$id, parsed.data.satisfied, previousSatisfied);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Check satisfy", error);
    return jsonError(502, "SATISFY_FAILED", "That could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Check unsatisfy");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in first.");
  }

  try {
    const user = await getUserRow(auth.account.$id).catch(() => null);
    await clearDaySatisfied(auth.account.$id, todayDay(user?.tz ?? null));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Check unsatisfy", error);
    return jsonError(502, "SATISFY_CLEAR_FAILED", "That could not be cleared.");
  }
}
