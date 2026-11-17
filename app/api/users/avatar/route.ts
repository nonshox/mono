import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  ensureUserForAccount,
  setUserAvatar,
  getUserRow,
} from "@/features/users/service";
import {
  AVATAR_MAX_BYTES,
  sniffImageMime,
  uploadAvatarFile,
} from "@/features/users/avatar";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Avatar upload");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to change your photo.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "INVALID_FORM", "Send a multipart form with an avatar field.");
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return jsonError(400, "INVALID_INPUT", "Choose an image to upload.");
  }
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    return jsonError(400, "TOO_LARGE", "Keep the photo under 2 MB.");
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = sniffImageMime(bytes);
    if (!mime) {
      return jsonError(400, "INVALID_IMAGE", "Use a JPEG, PNG, WebP or GIF image.");
    }
    const fileName = (file.name || "avatar").split(/[\\/]/).pop()?.slice(0, 80) || "avatar";
    const fileId = await uploadAvatarFile(bytes, fileName);
    await ensureUserForAccount(auth.account.$id, auth.account.email);
    const row = await setUserAvatar(auth.account.$id, fileId);
    const profile = await getUserRow(auth.account.$id);
    return NextResponse.json({
      email: row.email,
      name: row.name,
      avatar: row.avatar ?? "",
      nudge: row.nudge ?? false,
      ai: row.ai ?? false,
      tz: profile?.tz ?? null,
    });
  } catch (error) {
    logFailure("Avatar upload", error);
    return jsonError(502, "AVATAR_FAILED", "Your photo could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Avatar remove");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in first.");
  }

  try {
    await ensureUserForAccount(auth.account.$id, auth.account.email);
    const row = await setUserAvatar(auth.account.$id, null);
    const profile = await getUserRow(auth.account.$id);
    return NextResponse.json({
      email: row.email,
      name: row.name,
      avatar: row.avatar ?? "",
      nudge: row.nudge ?? false,
      ai: row.ai ?? false,
      tz: profile?.tz ?? null,
    });
  } catch (error) {
    logFailure("Avatar remove", error);
    return jsonError(502, "AVATAR_FAILED", "Your photo could not be removed.");
  }
}
