import "server-only";
import { getDatabaseId, getTables } from "@/lib/appwrite/tables";
import { deleteFile, uploadFile } from "@/features/files/service";
import { getUserRow, type UserRow } from "./service";

const tableId = "users";

/** Uploads a new avatar, swaps it in, and removes the old file best-effort. */
export async function setAvatarForAccount(
  userId: string,
  buffer: Buffer,
  contentType: string,
): Promise<UserRow> {
  const previous = await getUserRow(userId);
  const uploaded = await uploadFile({
    buffer,
    filename: `avatar-${userId}.${extensionFor(contentType)}`,
    contentType,
    publicRead: true,
  });

  const row = await getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { avatar: uploaded.id },
  });

  if (previous?.avatar) {
    await deleteFile(previous.avatar).catch(() => undefined);
  }

  return { ...row, avatar: row.avatar ?? uploaded.id };
}

export async function clearAvatarForAccount(userId: string): Promise<void> {
  const previous = await getUserRow(userId);
  if (!previous?.avatar) {
    return;
  }

  await getTables().updateRow<UserRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: userId,
    data: { avatar: "" },
  });

  await deleteFile(previous.avatar).catch(() => undefined);
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}
