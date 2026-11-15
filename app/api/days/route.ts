import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  deleteDayEntry,
  listYearEntries,
  upsertDayEntry,
} from "@/features/days/service";
import {
  deleteDaySchema,
  upsertDaySchema,
  yearSchema,
} from "@/features/days/schemas";

export async function GET(request: Request) {
  const auth = await getAuthAccount("Days lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view your days.");
  }

  const rawYear = Number(new URL(request.url).searchParams.get("year"));
  const parsedYear = yearSchema.safeParse(rawYear);
  if (!parsedYear.success) {
    return jsonError(400, "INVALID_INPUT", "Ask for a valid year.");
  }

  try {
    const entries = await listYearEntries(auth.account.$id, parsedYear.data);
    return NextResponse.json(
      { days: entries },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Days lookup", error);
    return jsonError(502, "DAYS_UNAVAILABLE", "Your days are unavailable right now.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Day save");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to write your days.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = upsertDaySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Write between 1 and 1000 characters.");
  }

  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (parsed.data.day > tomorrowUtc) {
    return jsonError(400, "FUTURE_DAY", "That day hasn't happened yet.");
  }

  try {
    const entry = await upsertDayEntry(
      auth.account.$id,
      parsed.data.day,
      parsed.data.text,
    );
    return NextResponse.json({ day: entry });
  } catch (error) {
    logFailure("Day save", error);
    return jsonError(502, "DAY_SAVE_FAILED", "That day could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Day delete");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to erase days.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = deleteDaySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid day.");
  }

  try {
    await deleteDayEntry(auth.account.$id, parsed.data.day);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Day delete", error);
    return jsonError(502, "DAY_DELETE_FAILED", "That day could not be erased.");
  }
}

