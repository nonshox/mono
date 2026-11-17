import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure } from "@/lib/http";
import { z } from "zod";
import {
  clearReadNotifications as clearReadInDb,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead as markAllReadInDb,
  markNotificationRead,
} from "@/features/notifications/service";

const patchSchema = z.union([
  z.object({ id: z.string().min(1).max(64) }).strict(),
  z.object({ id: z.literal("all") }).strict(),
]);

export async function GET(request: Request) {
  const auth = await getAuthAccount("Notification list");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view notifications.");
  }

  // ?count=1 — the cheap badge-only path (id-only rows, ~1 KB).
  if (new URL(request.url).searchParams.get("count") === "1") {
    const unreadCount = await countUnreadNotifications(auth.account.$id);
    return NextResponse.json({ unreadCount }, { headers: NO_STORE_HEADERS });
  }

  try {
    const items = await listNotifications(auth.account.$id, 50);
    const unreadCount = items.filter((item) => !item.read).length;
    return NextResponse.json(
      { items, hasMore: false, unreadCount },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    logFailure("Notification list", error);
    return jsonError(
      502,
      "NOTIFICATIONS_UNAVAILABLE",
      "Notifications are unavailable.",
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Notification update");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to update notifications.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Check the notification id.");
  }

  try {
    if (parsed.data.id === "all") {
      await markAllReadInDb(auth.account.$id);
    } else {
      await markNotificationRead(auth.account.$id, parsed.data.id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Notification update", error);
    return jsonError(
      502,
      "NOTIFICATIONS_UNAVAILABLE",
      "Notifications are unavailable.",
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Notification clear");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to clear notifications.");
  }

  try {
    const deleted = await clearReadInDb(auth.account.$id);
    return NextResponse.json({ deleted });
  } catch (error) {
    logFailure("Notification clear", error);
    return jsonError(
      502,
      "NOTIFICATIONS_CLEAR_FAILED",
      "Read notifications could not be cleared.",
    );
  }
}
