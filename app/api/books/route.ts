import { NextResponse } from "next/server";
import {
  NO_STORE_HEADERS,
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { createBook, deleteBook, listBooks, updateBook } from "@/features/books/service";
import { isNotFound } from "@/lib/appwrite/tables";
import {
  bookInputSchema,
  deleteBookSchema,
  updateBookSchema,
} from "@/features/books/schemas";

export async function GET() {
  const auth = await getAuthAccount("Books lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view your books.");
  }

  try {
    const books = await listBooks(auth.account.$id);
    return NextResponse.json({ books }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    logFailure("Books lookup", error);
    return jsonError(502, "BOOKS_UNAVAILABLE", "Your reading journey is unavailable right now.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Book save");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to log a book.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = bookInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Give the book a title (200 characters or fewer).");
  }

  try {
    const book = await createBook(auth.account.$id, parsed.data);
    return NextResponse.json({ book });
  } catch (error) {
    logFailure("Book save", error);
    return jsonError(502, "BOOK_SAVE_FAILED", "That book could not be saved.");
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Book update");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to edit a book.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateBookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Give the book a title (200 characters or fewer).");
  }

  const { id, ...input } = parsed.data;
  try {
    const book = await updateBook(auth.account.$id, id, input);
    return NextResponse.json({ book });
  } catch (error) {
    if (isNotFound(error)) {
      return jsonError(404, "BOOK_NOT_FOUND", "That book no longer exists.");
    }
    logFailure("Book update", error);
    return jsonError(502, "BOOK_UPDATE_FAILED", "That book could not be updated.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Book delete");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to remove a book.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = deleteBookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid book.");
  }

  try {
    await deleteBook(auth.account.$id, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Book delete", error);
    return jsonError(502, "BOOK_DELETE_FAILED", "That book could not be removed.");
  }
}
