"use client";

/**
 * Local-only file storage in the browser's IndexedDB. Nothing leaves the
 * device; clearing site data clears the stash. No server, no sync.
 */

const DB_NAME = "mono-stash";
const LEGACY_DB_NAME = "mono-library";
const LEGACY_DB_VERSION = 1;
const DB_VERSION = 3;
const STORE = "books";
const WORDS_STORE = "words";

export type StashBook = {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  blob: Blob;
};

export type StashWord = {
  id: string;
  term: string;
  meaning: string;
  /** Free-form user note — anything they want to remember about the term. */
  note: string;
  lang: string;
  addedAt: string;
  /** ISO timestamp when this card is due. Defaults to its creation time. */
  dueAt: string;
  /** Days until the next review; 0 means due now. */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
};

/** SM-2-ish flavor tuned for small decks — matches what Anki users expect. */
const DEFAULT_EASE = 2.5;
const AGAIN_DELAY_MS = 5 * 60 * 1000; // relearn within the session
const DAY_MS = 86_400_000;

function openStash(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(WORDS_STORE)) {
        db.createObjectStore(WORDS_STORE, { keyPath: "id" });
      }
      // v2 → v3: words gain spaced-repetition scheduling fields. Backfill any
      // existing rows so old installs keep every word, now due immediately.
      if (oldVersion < 3) {
        const store = request.transaction!.objectStore(WORDS_STORE);
        const all = store.getAll();
        all.onsuccess = () => {
          const now = new Date().toISOString();
          for (const row of all.result as Partial<StashWord>[]) {
            if (row.dueAt === undefined) {
              row.dueAt = now;
              row.interval = 0;
              row.ease = DEFAULT_EASE;
              row.reps = 0;
              row.lapses = 0;
              store.put(row);
            }
          }
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Stash unavailable"));
  });
}

function readLegacy(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    // Opening a missing database would create it — remember that via
    // onupgradeneeded so we can delete the empty shell instead of migrating.
    let created = false;
    const request = indexedDB.open(LEGACY_DB_NAME, LEGACY_DB_VERSION);
    request.onupgradeneeded = () => {
      created = true;
    };
    request.onsuccess = () => {
      if (created) {
        request.result.close();
        resolve(null);
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => resolve(null);
  });
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve(); // best-effort
    request.onblocked = () => resolve();
  });
}

/**
 * One-time move from the old "mono-library" database into "mono-stash" so
 * existing installs keep their files. Runs at most once per page load and
 * leaves the legacy copy untouched if anything fails.
 */
let legacyMigration: Promise<void> | null = null;
function migrateLegacyOnce(): Promise<void> {
  if (!legacyMigration) {
    legacyMigration = (async () => {
      const legacy = await readLegacy();
      if (!legacy) {
        // Either it never existed (delete the empty shell we may have
        // created) or it is unreadable — nothing to move.
        await deleteDatabase(LEGACY_DB_NAME);
        return;
      }
      let migrated = false;
      try {
        if (!legacy.objectStoreNames.contains(STORE)) {
          migrated = true;
        } else {
          const books = await new Promise<StashBook[]>((resolve, reject) => {
            const transaction = legacy.transaction(STORE, "readonly");
            const request = transaction.objectStore(STORE).getAll();
            request.onsuccess = () =>
              resolve(request.result as StashBook[]);
            request.onerror = () =>
              reject(request.error ?? new Error("Could not read the old storage"));
          });
          if (books.length === 0) {
            migrated = true;
          } else {
            const db = await openStash();
            await new Promise<void>((resolve, reject) => {
              const transaction = db.transaction(STORE, "readwrite");
              const store = transaction.objectStore(STORE);
              for (const book of books) store.put(book);
              transaction.oncomplete = () => {
                db.close();
                resolve();
              };
              transaction.onerror = () => {
                db.close();
                reject(
                  transaction.error ?? new Error("Could not migrate storage"),
                );
              };
            });
            migrated = true;
          }
        }
      } finally {
        legacy.close();
        // Only drop the old database once its contents are safely copied —
        // otherwise a later load retries the move.
        if (migrated) await deleteDatabase(LEGACY_DB_NAME);
      }
    })().catch((cause: unknown) => {
      // Keep the legacy database so a later load can retry the move.
      legacyMigration = null;
      console.warn("Stash migration skipped", cause);
    });
  }
  return legacyMigration;
}

function run<T>(
  mode: IDBTransactionMode,
  storeName: string,
  task: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return migrateLegacyOnce().then(() => openStash()).then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = task(transaction.objectStore(storeName));
        transaction.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Stash operation failed"));
        };
      }),
  );
}

export async function listBooks(): Promise<StashBook[]> {
  const books = await run("readonly", STORE, (store) => store.getAll() as IDBRequest<StashBook[]>);
  return books.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function saveBook(file: File): Promise<StashBook> {
  const book: StashBook = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };
  await run("readwrite", STORE, (store) => store.put(book) as IDBRequest<IDBValidKey>);
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  await run("readwrite", STORE, (store) => store.delete(id) as IDBRequest<undefined>);
}

function normalizeWord(word: StashWord): StashWord {
  return {
    ...word,
    note: word.note ?? "",
    // Defensive defaults for rows that predate scheduling.
    dueAt: word.dueAt ?? word.addedAt ?? new Date().toISOString(),
    interval: word.interval ?? 0,
    ease: word.ease ?? DEFAULT_EASE,
    reps: word.reps ?? 0,
    lapses: word.lapses ?? 0,
  };
}

export async function listWords(): Promise<StashWord[]> {
  const words = await run("readonly", WORDS_STORE, (store) => store.getAll() as IDBRequest<StashWord[]>);
  return words.map(normalizeWord).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export type NewStashWord = {
  term: string;
  meaning: string;
  note?: string;
  lang?: string;
};

export async function saveWord(input: NewStashWord): Promise<StashWord> {
  const word: StashWord = {
    id: crypto.randomUUID(),
    term: input.term,
    meaning: input.meaning,
    note: input.note ?? "",
    lang: input.lang ?? "",
    addedAt: new Date().toISOString(),
    dueAt: new Date().toISOString(),
    interval: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
  };
  await run("readwrite", WORDS_STORE, (store) => store.put(word) as IDBRequest<IDBValidKey>);
  return word;
}

export async function updateWord(
  id: string,
  input: NewStashWord,
): Promise<StashWord> {
  const existing = await run("readonly", WORDS_STORE, (store) =>
    store.get(id) as IDBRequest<StashWord | undefined>,
  );
  if (!existing) {
    throw new Error("That word is no longer here.");
  }
  const word: StashWord = {
    ...existing,
    term: input.term,
    meaning: input.meaning,
    note: input.note ?? "",
    lang: input.lang ?? "",
  };
  await run("readwrite", WORDS_STORE, (store) => store.put(word) as IDBRequest<IDBValidKey>);
  return word;
}

export async function deleteWord(id: string): Promise<void> {
  await run("readwrite", WORDS_STORE, (store) => store.delete(id) as IDBRequest<undefined>);
}

/** Anki's four grades, in the order every spaced-repetition user knows. */
export type Grade = "again" | "hard" | "good" | "easy";

/** Pure — computes the next schedule for a word. Used for both grading and previews. */
function schedule(word: StashWord, grade: Grade): StashWord {
  const now = Date.now();
  let { ease, reps, lapses } = word;
  let interval: number;

  if (grade === "again") {
    reps = 0;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    return {
      ...word,
      reps,
      lapses,
      ease,
      interval: 0,
      dueAt: new Date(now + AGAIN_DELAY_MS).toISOString(),
    };
  }

  reps += 1;
  if (grade === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    interval = reps === 1 ? 0.5 : Math.max(0.5, word.interval * 1.2);
  } else if (grade === "good") {
    interval = reps === 1 ? 1 : Math.max(1, word.interval * ease);
  } else {
    ease += 0.15;
    interval = reps === 1 ? 3 : Math.max(3, word.interval * ease * 1.3);
  }
  return {
    ...word,
    reps,
    lapses,
    ease,
    interval,
    dueAt: new Date(now + interval * DAY_MS).toISOString(),
  };
}

function intervalLabel(days: number): string {
  if (days <= 0) return "5 min";
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours < 1 ? "<1 h" : `${hours} h`;
  }
  if (days < 30) return `${Math.max(1, Math.round(days))} d`;
  if (days < 365) return `${(days / 30.44).toFixed(days < 91.3 ? 1 : 0)} mo`;
  return `${(days / 365).toFixed(1)} y`;
}

/** Next interval per grade — rendered on the grade buttons like Anki does. */
export function previewGrades(word: StashWord): Record<Grade, string> {
  const normalized = normalizeWord(word);
  return {
    again: "5 min",
    hard: intervalLabel(schedule(normalized, "hard").interval),
    good: intervalLabel(schedule(normalized, "good").interval),
    easy: intervalLabel(schedule(normalized, "easy").interval),
  };
}

/** Is this card due right now (or overdue)? */
export function isDue(word: StashWord, now = Date.now()): boolean {
  return new Date(normalizeWord(word).dueAt).getTime() <= now;
}

/** Record a grade and persist the rescheduled card. */
export async function reviewWord(id: string, grade: Grade): Promise<StashWord> {
  const existing = await run("readonly", WORDS_STORE, (store) =>
    store.get(id) as IDBRequest<StashWord | undefined>,
  );
  if (!existing) {
    throw new Error("That word is no longer here.");
  }
  const word = schedule(normalizeWord(existing), grade);
  await run("readwrite", WORDS_STORE, (store) => store.put(word) as IDBRequest<IDBValidKey>);
  return word;
}

