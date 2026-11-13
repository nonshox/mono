/** Client-safe path helpers — never touch env, always same-origin. */

export function filePath(fileId?: string | null): string | null {
  if (!fileId) return null;
  return `/api/files/${encodeURIComponent(fileId)}`;
}
