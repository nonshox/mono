import "server-only";

import { ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient, getAppwriteBucketId } from "@/lib/appwrite/server";
import { logFailure } from "@/lib/http";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export type SniffedMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Identify the image from its magic bytes — never trust the client's contentType. */
export function sniffImageMime(bytes: Uint8Array): SniffedMime | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function getStorage() {
  return new Storage(createAdminClient());
}

/** Upload a sniffed image; the filename (with its extension) is stored as-is. */
export async function uploadAvatarFile(
  bytes: Buffer,
  filename: string,
): Promise<string> {
  const storage = getStorage();
  const file = await storage.createFile({
    bucketId: getAppwriteBucketId(),
    fileId: ID.unique(),
    file: InputFile.fromBuffer(bytes, filename),
    permissions: [],
  });
  return file.$id;
}

/** Best-effort delete; failures are logged, never thrown. */
export async function deleteAvatarFile(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  try {
    await getStorage().deleteFile({
      bucketId: getAppwriteBucketId(),
      fileId,
    });
  } catch (error) {
    logFailure("Avatar delete", error);
  }
}

/** Bytes + mime for the serve route. Sniffs magic bytes — never trusts metadata. */
export async function readAvatarFile(
  fileId: string,
): Promise<{ bytes: ArrayBuffer; mimeType: SniffedMime } | null> {
  try {
    const bytes = await getStorage().getFileDownload({
      bucketId: getAppwriteBucketId(),
      fileId,
    });
    const mimeType = sniffImageMime(new Uint8Array(bytes));
    if (!mimeType) return null;
    return { bytes, mimeType };
  } catch {
    return null;
  }
}
