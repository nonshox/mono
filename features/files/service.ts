import "server-only";
import { File } from "undici";
import {
  createAdminClient,
  getAppwriteBucketId,
} from "@/lib/appwrite/server";
import { ID, Permission, Role, Storage } from "node-appwrite";
import { isNotFound } from "@/lib/appwrite/tables";
import type { UploadedFile } from "./types";

/** 4 MB — plenty for avatars and in-app images. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const getStorage = () => new Storage(createAdminClient());

/** The SDK's .d.ts asks for the DOM `File`; at runtime its check is
 * `instanceof undici.File` against this same bundled copy. */
type SdkFileParam = Parameters<Storage["createFile"]>[2];

export type UploadInput = {
  buffer: Buffer | Uint8Array;
  filename: string;
  contentType: string;
  /** Anyone (even signed-out viewers) may read it — right for avatars. */
  publicRead?: boolean;
};

export async function uploadFile(input: UploadInput): Promise<UploadedFile> {
  const bucketId = getAppwriteBucketId();
  const name = input.filename.slice(0, 120) || "file";
  const file = new File([input.buffer], name, { type: input.contentType });

  const created = await getStorage().createFile({
    bucketId,
    fileId: ID.unique(),
    file: file as unknown as SdkFileParam,
    permissions: input.publicRead ? [Permission.read(Role.any())] : [],
  });

  return toUploadedFile(created);
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    await getStorage().deleteFile({
      bucketId: getAppwriteBucketId(),
      fileId,
    });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }
}

export type StoredFileContent = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

export async function readFile(fileId: string): Promise<StoredFileContent> {
  const bucketId = getAppwriteBucketId();
  const [metadata, content] = await Promise.all([
    getStorage().getFile({ bucketId, fileId }),
    getStorage().getFileView({ bucketId, fileId }),
  ]);

  return {
    buffer: Buffer.from(content),
    contentType: metadata.mimeType,
    filename: metadata.name,
  };
}

function toUploadedFile(file: {
  $id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
}): UploadedFile {
  return {
    id: file.$id,
    name: file.name,
    type: file.mimeType,
    size: file.sizeOriginal,
  };
}

export function isAllowedImage(type: string, size: number): boolean {
  return IMAGE_TYPES.has(type) && size > 0 && size <= MAX_FILE_BYTES;
}
