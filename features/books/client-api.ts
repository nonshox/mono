import { apiClient } from "@/lib/api-client";

export type CompletedBook = {
  id: string;
  title: string;
  author: string;
  note: string;
  days: number | null;
  created: string;
};

export type BookInput = {
  title: string;
  author: string;
  note: string;
  days: number | null;
};

export async function addBook(input: BookInput): Promise<CompletedBook> {
  const { data } = await apiClient.post<{ book: CompletedBook }>("/books", input);
  return data.book;
}

export async function updateBook(
  id: string,
  input: BookInput,
): Promise<CompletedBook> {
  const { data } = await apiClient.patch<{ book: CompletedBook }>("/books", {
    id,
    ...input,
  });
  return data.book;
}

export async function deleteBook(id: string): Promise<void> {
  await apiClient.delete("/books", { data: { id } });
}
