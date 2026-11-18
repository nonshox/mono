import "server-only";

import { randomUUID } from "node:crypto";
import { AppwriteException, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import type { BookInput } from "@/features/books/schemas";

const tableId = "books";

export type BookRow = Models.Row & {
  user: string;
  title: string;
  author?: string | null;
  note?: string | null;
  days?: number | null;
};

export type CompletedBook = {
  id: string;
  title: string;
  author: string;
  note: string;
  /** Approximate days taken to finish; null when not recorded. */
  days: number | null;
  /** ISO timestamp the row was created (when it was logged). */
  created: string;
};

const toCompletedBook = (row: BookRow): CompletedBook => ({
  id: row.$id,
  title: row.title,
  author: row.author ?? "",
  note: row.note ?? "",
  days: row.days ?? null,
  created: row.$createdAt,
});

/** Every finished book the user logged, newest first. */
export async function listBooks(userId: string): Promise<CompletedBook[]> {
  const result = await getTables().listRows<BookRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ],
    total: false,
  });
  return result.rows.map(toCompletedBook);
}

export async function createBook(
  userId: string,
  input: BookInput,
): Promise<CompletedBook> {
  const row = await getTables().createRow<BookRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: randomUUID(),
    permissions: [],
    data: {
      user: userId,
      title: input.title,
      author: input.author,
      note: input.note,
      days: input.days,
    },
  });
  return toCompletedBook(row);
}

async function ownedRow(userId: string, id: string): Promise<BookRow> {
  const row = await getTables().getRow<BookRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: id,
  });
  // Appwrite rows are private to their owner via empty permissions + admin I/O;
  // belt and braces: never touch another user's book even by guessing an id.
  if (row.user !== userId) {
    throw new AppwriteException("Book not found", 404, "row_not_found");
  }
  return row;
}

export async function updateBook(
  userId: string,
  id: string,
  input: BookInput,
): Promise<CompletedBook> {
  await ownedRow(userId, id);
  const row = await getTables().updateRow<BookRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: id,
    data: {
      title: input.title,
      author: input.author,
      note: input.note,
      days: input.days,
    },
  });
  return toCompletedBook(row);
}

export async function deleteBook(userId: string, id: string): Promise<void> {
  try {
    await ownedRow(userId, id);
  } catch (error) {
    if (isNotFound(error)) {
      return; // Already gone — delete is idempotent.
    }
    throw error;
  }
  await getTables().deleteRow({
    databaseId: getDatabaseId(),
    tableId,
    rowId: id,
  });
}
