"use client";

import {
  BookOpenText,
  Download,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { formatBytes } from "@/features/library/format";
import {
  deleteBook,
  listBooks,
  saveBook,
  type LibraryBook,
} from "@/features/library/idb";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function LibraryExperience() {
  const [books, setBooks] = useState<LibraryBook[] | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listBooks()
      .then((stored) => active && setBooks(stored))
      .catch(() => active && setBooks([]));
    return () => {
      active = false;
    };
  }, []);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setSaving(true);
    let saved = 0;
    try {
      for (const file of files) {
        // Files stay on this device; nothing is uploaded anywhere.
        const book = await saveBook(file);
        setBooks((current) =>
          [...(current ?? []), book].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
        );
        saved += 1;
      }
      toast.success(saved === 1 ? "Book saved on this device" : `${saved} books saved on this device`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const download = (book: LibraryBook) => {
    const url = URL.createObjectURL(book.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = book.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const erase = async (id: string) => {
    try {
      await deleteBook(id);
      setBooks((current) => (current ?? []).filter((book) => book.id !== id));
      toast.success("Removed");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not remove");
    }
  };

  return (
    <main className="min-h-full w-full bg-background px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <h1 className="sr-only">Library</h1>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:max-w-3xl">
        <header className="px-1">
          <h2 className="type-title text-foreground">Library</h2>
          <p className="mt-1 text-xs text-foreground">
            {books === null ? "Loading…" : `${books.length} ${books.length === 1 ? "book" : "books"} · stored on this device`}
          </p>
        </header>

        <section className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5">
          <input
            accept=".epub,.pdf,.txt,.md,.mobi,.fb2,.rtf,application/epub+zip,application/pdf,text/plain"
            aria-label="Upload book"
            className="hidden"
            multiple
            onChange={(event) => void onPick(event)}
            ref={inputRef}
            type="file"
          />
          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-xs font-bold text-foreground outline-none transition hover:border-foreground/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
            {saving ? "Saving…" : "Upload books"}
          </button>

          {books === null ? (
            <p className="grid place-items-center py-10 text-xs font-semibold text-foreground">
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            </p>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BookOpenText aria-hidden="true" className="size-7 text-foreground" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-foreground">
                No books yet
              </p>
              <p className="max-w-xs text-xs leading-5 text-foreground">
                EPUB, PDF, TXT, Markdown, MOBI, FB2, RTF — saved on this device only.
              </p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {books.map((book) => (
                <li className="flex items-center gap-3 py-3" key={book.id}>
                  <BookOpenText
                    aria-hidden="true"
                    className="size-4 shrink-0 text-foreground"
                    strokeWidth={1.8}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-5 text-foreground">
                      {book.name}
                    </p>
                    <p className="text-[11px] tabular-nums text-foreground">
                      {formatBytes(book.size)} · {shortDate(book.addedAt)}
                    </p>
                  </div>
                  <button
                    aria-label={`Download ${book.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => download(book)}
                    type="button"
                  >
                    <Download aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      aria-label={`Remove ${book.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Remove this book?</AlertDialogTitle>
                      <AlertDialogDescription className="mt-1.5">
                        {`“${book.name}” will be deleted from this device. It is not stored anywhere else.`}
                      </AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void erase(book.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
