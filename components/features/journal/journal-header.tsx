"use client";

import {
  BookOpenCheck,
  BookPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PenLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  addBook,
  deleteBook,
  updateBook,
  type CompletedBook,
} from "@/features/books/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "cn";

const STEPS = ["Title", "Author", "Days", "Reflect"] as const;

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Journal's compact header: one line — search (left) · reading journey
 * (right) — with the expandable finished-books list below. Results follow
 * directly underneath; no separate full-width strips.
 */
export function JournalHeader({
  query,
  onQueryChange,
  matches,
  total,
  initialBooks = [],
  showSearch = true,
}: {
  /** Current search query (controlled by the journal page). */
  query: string;
  onQueryChange: (value: string) => void;
  /** Entries matching the query. */
  matches: number;
  /** All entries. */
  total: number;
  /** Finished books, server-rendered. */
  initialBooks?: CompletedBook[];
  /** False for the empty-journal page (search would do nothing). */
  showSearch?: boolean;
}) {
  const [books, setBooks] = useState(initialBooks);
  const [expanded, setExpanded] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompletedBook | null>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [daysTaken, setDaysTaken] = useState("");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedQuery = query.trim();
  const count = books.length;

  const resetForm = () => {
    setEditing(null);
    setStep(0);
    setTitle("");
    setAuthor("");
    setDaysTaken("");
    setNote("");
    setFieldError(null);
    setSaving(false);
  };

  const openDialog = (book: CompletedBook | null) => {
    setEditing(book);
    setStep(0);
    setTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
    setDaysTaken(book?.days ? String(book.days) : "");
    setNote(book?.note ?? "");
    setFieldError(null);
    setSaving(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  /** Validates the current step; sets an inline error and returns false when invalid. */
  const validateStep = (): boolean => {
    if (step === 0 && title.trim().length === 0) {
      setFieldError("Give the book a title.");
      return false;
    }
    if (step === 2 && daysTaken.trim()) {
      const parsed = Number(daysTaken.trim());
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
        setFieldError("Whole days, between 1 and 3650.");
        return false;
      }
    }
    setFieldError(null);
    return true;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    void save();
  };

  const save = async () => {
    const parsedDays = daysTaken.trim() ? Number(daysTaken.trim()) : null;
    const input = {
      title: title.trim(),
      author: author.trim(),
      note: note.trim(),
      days: parsedDays,
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateBook(editing.id, input);
        setBooks((current) =>
          current.map((book) => (book.id === updated.id ? updated : book)),
        );
        toast.success("Book updated");
      } else {
        const created = await addBook(input);
        setBooks((current) => [created, ...current]);
        toast.success("Added to your reading journey");
      }
      closeDialog();
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "That book could not be saved."));
      setSaving(false);
    }
  };

  const erase = async (book: CompletedBook) => {
    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      toast.success("Removed from your reading journey");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "That book could not be removed."));
    }
  };

  return (
    <section aria-label="Journal header" className="border-b border-border/60 pb-2">
      {/* One line: search · journey */}
      <div className="flex items-center gap-1.5 pb-1 pt-0.5">
        {showSearch ? (
          <>
            <Search
              aria-hidden="true"
              className="size-3.5 shrink-0 text-foreground"
              strokeWidth={2}
            />
            <Input
              aria-label="Search your journal"
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 md:text-sm"
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onQueryChange("");
              }}
              placeholder="Search your journal…"
              spellCheck={false}
              value={query}
            />
            {trimmedQuery ? (
              <span className="shrink-0 text-xs tabular-nums text-foreground">
                {matches} / {total}
              </span>
            ) : null}
            {query ? (
              <Button
                aria-label="Clear search"
                className="size-5 rounded-full"
                onClick={() => onQueryChange("")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-3" strokeWidth={2.5} />
              </Button>
            ) : null}
            <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border/70" />
          </>
        ) : null}

        {/* Journey chip — one tap toggles the list */}
        {count > 0 ? (
          <Button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} your finished books, ${count} total`}
            className="h-8 shrink-0 gap-1 rounded-full px-1.5"
            onClick={() => setExpanded((current) => !current)}
            title={`${count} ${count === 1 ? "book" : "books"} finished — tap to ${expanded ? "hide" : "see"}`}
            type="button"
            variant="ghost"
          >
            <BookOpenCheck aria-hidden="true" className="size-4" strokeWidth={1.8} />
            <span className="text-xs font-bold tabular-nums">{count}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-3 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              strokeWidth={2}
            />
          </Button>
        ) : (
          <span
            className="flex h-8 shrink-0 items-center gap-1 rounded-full px-1.5 text-foreground/70"
            title="No books finished yet"
          >
            <BookOpenCheck aria-hidden="true" className="size-4" strokeWidth={1.8} />
            <span className="text-xs font-bold tabular-nums">0</span>
          </span>
        )}

        <Button
          aria-label="Log a finished book"
          className="h-8 shrink-0 gap-1 rounded-xl border-2 border-border px-2 text-[11px] font-bold"
          onClick={() => openDialog(null)}
          variant="outline"
        >
          <BookPlus aria-hidden="true" className="size-4" strokeWidth={1.8} />
          <span className="hidden min-[480px]:inline">Log a finished book</span>
          <span className="min-[480px]:hidden">Log</span>
        </Button>
      </div>

      {expanded && count > 0 && (
        <ul className="mb-1 divide-y divide-border/60 rounded-xl border-2 border-border/60 bg-popover px-3">
          {books.map((book) => (
            <li className="flex items-start gap-2 py-2.5" key={book.id}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-5 text-foreground">
                  {book.title}
                  {book.author ? (
                    <span className="font-medium text-foreground/75">
                      {" "}
                      · {book.author}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
                  {shortDate(book.created)}
                  {book.days
                    ? ` · ~${book.days} ${book.days === 1 ? "day" : "days"}`
                    : ""}
                </p>
                {book.note ? (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-4 text-foreground/85">
                    {book.note}
                  </p>
                ) : null}
              </div>
              <Button
                aria-label={`Edit ${book.title}`}
                className="size-8 shrink-0 rounded-full"
                onClick={() => openDialog(book)}
                size="icon"
                variant="ghost"
              >
                <PenLine aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  aria-label={`Remove ${book.title}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Remove this book?</AlertDialogTitle>
                  <AlertDialogDescription className="mt-1.5">
                    {`“${book.title}” will be deleted from your reading journey. This cannot be undone.`}
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void erase(book)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit book" : "Log a finished book"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this record."
                : "A quiet moment for each book you finish."}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div aria-hidden="true" className="flex items-center gap-1.5">
            {STEPS.map((label, index) => (
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= step ? "bg-foreground" : "bg-border/70",
                )}
                key={label}
              />
            ))}
          </div>

          <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
            {step === 0 && (
              <div className="grid gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground" htmlFor="book-title">
                  Book title <span aria-hidden="true" className="text-destructive">*</span>
                </label>
                <Input
                  aria-describedby={fieldError ? "book-title-error" : undefined}
                  aria-invalid={fieldError ? true : undefined}
                  aria-label="Book title"
                  autoFocus
                  className="h-11 text-sm"
                  id="book-title"
                  maxLength={200}
                  placeholder="e.g. The Lathe of Heaven"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                />
                {fieldError ? (
                  <p className="text-[11px] font-semibold text-destructive" id="book-title-error" role="alert">
                    {fieldError}
                  </p>
                ) : null}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground" htmlFor="book-author">
                  Author <span className="font-medium normal-case text-foreground/60">(optional)</span>
                </label>
                <Input
                  aria-label="Author"
                  autoFocus
                  className="h-11 text-sm"
                  id="book-author"
                  maxLength={200}
                  placeholder="e.g. Ursula K. Le Guin"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground" htmlFor="book-days">
                  Days to finish <span className="font-medium normal-case text-foreground/60">(optional)</span>
                </label>
                <Input
                  aria-describedby={fieldError ? "book-days-error" : undefined}
                  aria-invalid={fieldError ? true : undefined}
                  aria-label="Approximate days taken to finish"
                  autoFocus
                  className="h-11 text-sm"
                  id="book-days"
                  inputMode="numeric"
                  max={3650}
                  min={1}
                  placeholder="e.g. 6"
                  type="number"
                  value={daysTaken}
                  onChange={(event) => {
                    setDaysTaken(event.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                />
                {fieldError ? (
                  <p className="text-[11px] font-semibold text-destructive" id="book-days-error" role="alert">
                    {fieldError}
                  </p>
                ) : (
                  <p className="text-[10px] text-foreground/60">
                    Just a rough sense — no need to be exact.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground" htmlFor="book-note">
                  Reflection <span className="font-medium normal-case text-foreground/60">(optional)</span>
                </label>
                <Textarea
                  aria-label="Reflection"
                  autoFocus
                  className="min-h-28 text-sm"
                  id="book-note"
                  maxLength={1000}
                  placeholder="A favorite takeaway, a line you loved, why it stayed with you…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                className="h-10 gap-1 rounded-xl px-3 text-xs font-bold"
                disabled={step === 0}
                onClick={() => {
                  setFieldError(null);
                  setStep((current) => Math.max(0, current - 1));
                }}
                type="button"
                variant="ghost"
              >
                <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button className="h-10 gap-1 rounded-xl px-4 text-xs font-bold" type="submit" variant="default">
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  className="h-10 gap-1.5 rounded-xl px-4 text-xs font-bold"
                  disabled={saving}
                  type="submit"
                  variant="default"
                >
                  {saving ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                  )}
                  {saving ? "Saving…" : editing ? "Save changes" : "Add book"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
