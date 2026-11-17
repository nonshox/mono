import { createHash } from "node:crypto";

/**
 * Deterministic 32-char sha256-derived row id. Appwrite row ids must be
 * unique and URL-safe; truncated hex is both. Same input → same id, always.
 */
export function sha256RowId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
