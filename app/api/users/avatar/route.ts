import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { isAllowedImage } from "@/features/files/service";
import {
  clearAvatarForAccount,
  setAvatarForAccount,
} from "@/features/users/avatar";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Avatar update");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to update your avatar.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "INVALID_FORM", "Send the image as multipart form data.");
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return jsonError(400, "INVALID_FORM", "Attach a photo with the name 'image'.");
  }
  if (!isAllowedImage(image.type, image.size)) {
    return jsonError(
      400,
      "IMAGE_INVALID",
      "Use a JPEG, PNG, or WebP image under 4 MB.",
    );
  }

  try {
    const row = await setAvatarForAccount(
      auth.account.$id,
      Buffer.from(await image.arrayBuffer()),
      image.type,
    );
    return NextResponse.json({ avatar: row.avatar ?? "" });
  } catch (error) {
    logFailure("Avatar update", error);
    return jsonError(502, "AVATAR_UPDATE_FAILED", "Your photo could not be saved.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Avatar removal");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to remove your avatar.");
  }

  try {
    await clearAvatarForAccount(auth.account.$id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logFailure("Avatar removal", error);
    return jsonError(502, "AVATAR_REMOVE_FAILED", "Your photo could not be removed.");
  }
}
