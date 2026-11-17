import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  ensureUserForAccount,
  getUserRow,
  setUserAi,
  setUserNudge,
  setUserTz,
  updateUserName,
} from "@/features/users/service";
import { updateUserSchema } from "@/features/users/schemas";

export async function GET() {
  const auth = await getAuthAccount("User lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view your profile.");
  }

  try {
    const row = await ensureUserForAccount(
      auth.account.$id,
      auth.account.email,
    );
    return NextResponse.json(
      {
        email: row.email,
        name: row.name,
        avatar: row.avatar ?? "",
        nudge: row.nudge ?? false,
        ai: row.ai ?? false,
        tz: row.tz ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("User lookup", error);
    return jsonError(502, "USER_UNAVAILABLE", "Your profile is unavailable.");
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("User update");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to update your profile.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Check what you sent and try again.");
  }

  try {
    await ensureUserForAccount(auth.account.$id, auth.account.email);
    if (parsed.data.name !== undefined) {
      await updateUserName(auth.account.$id, parsed.data.name);
    }
    if (parsed.data.nudge !== undefined) {
      await setUserNudge(auth.account.$id, parsed.data.nudge);
    }
    if (parsed.data.ai !== undefined) {
      await setUserAi(auth.account.$id, parsed.data.ai);
    }
    if (parsed.data.tz !== undefined) {
      await setUserTz(auth.account.$id, parsed.data.tz);
    }
    const row = await getUserRow(auth.account.$id);
    return NextResponse.json({
      email: row?.email ?? auth.account.email,
      name: row?.name ?? "",
      avatar: row?.avatar ?? "",
      nudge: row?.nudge ?? false,
      ai: row?.ai ?? false,
      tz: row?.tz ?? null,
    });
  } catch (error) {
    logFailure("User update", error);
    return jsonError(502, "USER_UPDATE_FAILED", "Your profile could not be saved.");
  }
}
