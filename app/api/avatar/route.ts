import { getAuthAccount, jsonError, logFailure } from "@/lib/http";
import { readAvatarFile } from "@/features/users/avatar";

const FILE_ID_FORMAT = /^[A-Za-z0-9()_.-]{1,64}$/;

/** Serve an avatar image. Any signed-in user may view avatars. */
export async function GET(request: Request) {
  const auth = await getAuthAccount("Avatar view");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view photos.");
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!FILE_ID_FORMAT.test(id)) {
    return jsonError(400, "INVALID_ID", "That avatar id is not valid.");
  }

  try {
    const avatar = await readAvatarFile(id);
    if (!avatar) {
      return jsonError(404, "NOT_FOUND", "That photo no longer exists.");
    }
    return new Response(avatar.bytes, {
      headers: {
        "Content-Type": avatar.mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": String(avatar.bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logFailure("Avatar view", error);
    return jsonError(502, "AVATAR_UNAVAILABLE", "That photo could not be loaded.");
  }
}
