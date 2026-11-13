import {
  jsonError,
  logFailure,
} from "@/lib/http";
import { readFile } from "@/features/files/service";
import { isNotFound } from "@/lib/appwrite/tables";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

/**
 * Avatars (and any public uploads) are public-read by design — next/image's
 * internal optimizer fetches this route without a session cookie, so we can't
 * gate on auth here. Private buckets stay out of this route by simply not
 * existing in it (upload returns 404 for anything unknown).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;

  try {
    const stored = await readFile(fileId);
    return new Response(new Uint8Array(stored.buffer), {
      headers: {
        "Content-Type": stored.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isNotFound(error)) {
      return jsonError(404, "FILE_NOT_FOUND", "That file does not exist.");
    }
    logFailure("File read", error);
    return jsonError(502, "FILE_UNAVAILABLE", "The file is unavailable.");
  }
}
