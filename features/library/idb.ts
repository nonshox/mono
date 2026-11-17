"use client";

/**
 * Local-only book storage in the browser's IndexedDB. Nothing leaves the
 * device; clearing site data clears the library. No server, no sync.
 */

const DB_NAME = "mono-library";
const DB_VERSION = 1;
const STORE = "books";

export type LibraryBook = {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  blob: Blob;
};

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Library unavailable"));
  });
}

function run<T>(
  mode: IDBTransactionMode,
  task: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openLibrary().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = task(transaction.objectStore(STORE));
        transaction.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Library operation failed"));
        };
      }),
  );
}

export async function listBooks(): Promise<LibraryBook[]> {
  const books = await run("readonly", (store) => store.getAll() as IDBRequest<LibraryBook[]>);
  return books.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function saveBook(file: File): Promise<LibraryBook> {
  const book: LibraryBook = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };
  await run("readwrite", (store) => store.put(book) as IDBRequest<IDBValidKey>);
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
}
