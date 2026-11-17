import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  createItemSchema,
  deleteItemSchema,
  patchItemSchema,
} from "@/features/today/schemas";
import {
  createTimelineItem,
  deleteTimelineItem,
  loadTodayBundle,
  moveTimelineItem,
  setTimelineItemDone,
  updateTimelineItemText,
} from "@/features/today/service";

export async function GET() {
  const auth = await getAuthAccount("Today lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to see your day.");
  }

  try {
    const bundle = await loadTodayBundle(auth.account.$id);
    return NextResponse.json(
      bundle,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Today lookup", error);
    return jsonError(502, "TODAY_UNAVAILABLE", "Today is unavailable right now.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today create");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to capture.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Give it text first.");
  }

  try {
    const item = await createTimelineItem(
      auth.account.$id,
      parsed.data.bucket,
      parsed.data.text,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logFailure("Today create", error);
    return jsonError(502, "TODAY_CREATE_FAILED", "That did not save.");
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today toggle");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to tick.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = patchItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid action.");
  }

  try {
    if (parsed.data.kind === "toggle") {
      const ok = await setTimelineItemDone(
        auth.account.$id,
        parsed.data.id,
        parsed.data.done,
      );
      if (!ok) {
        return jsonError(404, "ITEM_NOT_FOUND", "That item no longer exists.");
      }
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.kind === "move") {
      const ok = await moveTimelineItem(
        auth.account.$id,
        parsed.data.id,
        parsed.data.direction,
      );
      if (!ok) {
        return jsonError(404, "ITEM_NOT_FOUND", "That item no longer exists.");
      }
      return NextResponse.json({ ok: true });
    }
    const ok = await updateTimelineItemText(
      auth.account.$id,
      parsed.data.id,
      parsed.data.text,
    );
    if (!ok) {
      return jsonError(404, "ITEM_NOT_FOUND", "That item no longer exists.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Today patch", error);
    return jsonError(502, "TODAY_PATCH_FAILED", "That could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Today delete");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to delete.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = deleteItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid item.");
  }

  try {
    const ok = await deleteTimelineItem(auth.account.$id, parsed.data.id);
    if (!ok) {
      return jsonError(404, "ITEM_NOT_FOUND", "That item no longer exists.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Today delete", error);
    return jsonError(502, "TODAY_DELETE_FAILED", "That could not be removed.");
  }
}
