"use client";

import {
  BookOpenText,
  Download,
  Languages,
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
import { FileInput } from "@/components/ui/file-input";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/features/stash/format";
import { StashWords } from "@/components/features/stash/stash-words";
import {
  deleteBook,
  listBooks,
  saveBook,
  type StashBook,
} from "@/features/stash/idb";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function StashExperience() {
  const [tab, setTab] = useState<"books" | "words">("books");
  const [books, setBooks] = useState<StashBook[] | null>(null);
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

  const download = (book: StashBook) => {
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
      <h1 className="sr-only">Stash</h1>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 md:max-w-3xl">
        <div
          aria-label="Stash sections"
          className="flex gap-1 rounded-2xl border-2 border-border/70 bg-popover p-1"
          role="tablist"
        >
          <Button
            aria-controls="stash-panel-books"
            aria-selected={tab === "books"}
            className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold"
            id="stash-tab-books"
            onClick={() => setTab("books")}
            role="tab"
            type="button"
            variant={tab === "books" ? "default" : "ghost"}
          >
            <BookOpenText aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Books
          </Button>
          <Button
            aria-controls="stash-panel-words"
            aria-selected={tab === "words"}
            className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold"
            id="stash-tab-words"
            onClick={() => setTab("words")}
            role="tab"
            type="button"
            variant={tab === "words" ? "default" : "ghost"}
          >
            <Languages aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Words
          </Button>
        </div>

        <section
          aria-labelledby="stash-tab-books"
          className="pt-1"
          hidden={tab !== "books"}
          id="stash-panel-books"
          role="tabpanel"
        >
          <FileInput
            accept=".epub,.pdf,.txt,.md,.mobi,.fb2,.rtf,application/epub+zip,application/pdf,text/plain"
            aria-label="Upload book"
            multiple
            onChange={(event) => void onPick(event)}
            ref={inputRef}
          />
          <Button
            className="h-12 w-full gap-2 rounded-xl border-2 border-dashed text-xs font-bold hover:border-foreground/50 disabled:opacity-50"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
            {saving ? "Saving…" : "Upload books"}
          </Button>

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
                EPUB, PDF, TXT, Markdown, MOBI, FB2, RTF â€” saved on this device only.
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
                      {formatBytes(book.size)} Â· {shortDate(book.addedAt)}
                    </p>
                  </div>
                  <Button
                    aria-label={`Download ${book.name}`}
                    className="size-8 rounded-full"
                    onClick={() => download(book)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Download aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </Button>
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
                        {`â€œ${book.name}â€ will be deleted from this device. It is not stored anywhere else.`}
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

        <div
          aria-labelledby="stash-tab-words"
          hidden={tab !== "words"}
          id="stash-panel-words"
          role="tabpanel"
        >
          <StashWords />
        </div>
      </div>
    </main>
  );
}
