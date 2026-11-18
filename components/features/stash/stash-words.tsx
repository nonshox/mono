"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Languages,
  LoaderCircle,
  PenLine,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Volume2,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  deleteWord,
  listWords,
  saveWord,
  updateWord,
  type StashWord,
} from "@/features/stash/idb";

const LANGS: Array<{ value: string; label: string }> = [
  { value: "", label: "Auto" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
  { value: "zh-CN", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ru", label: "Russian" },
];

function langLabel(value: string): string {
  return LANGS.find((option) => option.value === value)?.label ?? "Auto";
}

export function StashWords() {
  const [words, setWords] = useState<StashWord[] | null>(null);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StashWord | null>(null);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [lang, setLang] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [practicing, setPracticing] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let active = true;
    listWords()
      .then((stored) => active && setWords(stored))
      .catch(() => active && setWords([]));
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setEditing(null);
    setTerm("");
    setMeaning("");
    setNote("");
    setLang("");
    setFieldError(null);
    setSaving(false);
  };

  const openDialog = (word: StashWord | null) => {
    setEditing(word);
    setTerm(word?.term ?? "");
    setMeaning(word?.meaning ?? "");
    setNote(word?.note ?? "");
    setLang(word?.lang ?? "");
    setFieldError(null);
    setSaving(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTerm = term.trim();
    const trimmedMeaning = meaning.trim();
    if (!trimmedTerm || !trimmedMeaning) {
      setFieldError("A word and its meaning are required.");
      return;
    }
    const input = {
      term: trimmedTerm,
      meaning: trimmedMeaning,
      note: note.trim(),
      lang,
    };
    setSaving(true);
    void (async () => {
      try {
        if (editing) {
          const updated = await updateWord(editing.id, input);
          setWords((current) =>
            (current ?? []).map((word) => (word.id === updated.id ? updated : word)),
          );
          toast.success("Word updated");
        } else {
          const word = await saveWord(input);
          setWords((current) => [word, ...(current ?? [])]);
          toast.success("Word saved on this device");
        }
        closeDialog();
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "Could not save");
        setSaving(false);
      }
    })();
  };

  const pronounce = (word: StashWord) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech is not available on this device");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(word.term);
    if (word.lang) utterance.lang = word.lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const erase = async (word: StashWord) => {
    try {
      await deleteWord(word.id);
      setWords((current) => (current ?? []).filter((item) => item.id !== word.id));
      toast.success("Removed");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not remove");
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = words ?? [];
    if (!needle) return all;
    return all.filter((word) =>
      `${word.term} ${word.meaning} ${word.note}`.toLowerCase().includes(needle),
    );
  }, [words, query]);

  const deck = words ?? [];
  const card = deck.length > 0 ? deck[cardIndex % deck.length] : null;

  const openPractice = () => {
    setDialogOpen(false);
    setCardIndex(0);
    setRevealed(false);
    setPracticing(true);
  };

  const step = (direction: 1 | -1) => {
    setRevealed(false);
    setCardIndex((current) => {
      const length = deck.length;
      return (current + direction + length) % length;
    });
  };

  const shuffle = () => {
    if (deck.length < 2) return;
    setRevealed(false);
    setCardIndex((current) => {
      let next = current;
      while (next === current) {
        next = Math.floor(Math.random() * deck.length);
      }
      return next;
    });
  };

  if (practicing && card) {
    return (
      <section aria-label="Practice words">
        <div className="flex items-center justify-between px-1 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
            {`Card ${(cardIndex % deck.length) + 1} of ${deck.length}`}
          </p>
          <Button
            aria-label="Close practice"
            className="size-8 rounded-full"
            onClick={() => setPracticing(false)}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Button>
        </div>

        <Button
          aria-pressed={revealed}
          className="flex h-auto min-h-52 w-full flex-col items-center justify-center gap-3 whitespace-normal rounded-2xl border-2 border-border px-6 py-10 text-center"
          onClick={() => setRevealed((current) => !current)}
          variant="outline"
        >
          <span className="text-3xl font-extrabold leading-tight text-foreground">
            {card.term}
          </span>
          {card.lang ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-foreground">
              {card.lang}
            </span>
          ) : null}
          {revealed ? (
            <span className="flex flex-col items-center gap-2 border-t-2 border-border/60 pt-3">
              <span className="text-sm font-semibold leading-6 text-foreground">
                {card.meaning}
              </span>
              {card.note ? (
                <span className="text-xs leading-5 text-foreground/85">
                  {card.note}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-foreground/70">
              Tap to reveal
            </span>
          )}
        </Button>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            aria-label="Previous card"
            className="size-11 rounded-xl border-2"
            onClick={() => step(-1)}
            size="icon"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          </Button>
          <Button
            className="h-11 flex-1 gap-2 rounded-xl border-2 text-xs font-bold"
            onClick={shuffle}
            variant="outline"
          >
            <Shuffle aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Shuffle
          </Button>
          <Button
            aria-label="Next card"
            className="size-11 rounded-xl"
            onClick={() => step(1)}
            size="icon"
            variant="default"
          >
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Vocabulary">
      {/* Toolbar — search leads, actions on the right */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/60"
            strokeWidth={1.8}
          />
          <Input
            aria-label="Search words"
            className="h-11 rounded-xl border-2 pl-10 text-sm focus-visible:border-ring"
            placeholder="Search words…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
          />
        </div>
        <Button
          aria-label="Practice with flashcards"
          className="h-11 shrink-0 gap-1.5 rounded-xl border-2 text-xs font-bold"
          disabled={(words?.length ?? 0) === 0}
          onClick={openPractice}
          variant="outline"
        >
          <GraduationCap aria-hidden="true" className="size-4" strokeWidth={1.8} />
          <span className="hidden min-[480px]:inline">Practice</span>
        </Button>
        <Button
          className="h-11 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
          onClick={() => openDialog(null)}
          variant="default"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
          <span className="hidden min-[420px]:inline">Add word</span>
        </Button>
      </div>

      {/* Word grid */}
      {words === null ? (
        <p className="grid place-items-center py-16 text-xs font-semibold text-foreground">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        </p>
      ) : words.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
            <Languages aria-hidden="true" className="size-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm font-bold text-foreground">No words yet</p>
          <p className="max-w-xs text-xs leading-relaxed text-foreground">
            Collect the words you want to keep — they stay on this device.
          </p>
          <Button
            className="mt-1 h-11 gap-1.5 rounded-xl px-5 text-xs font-bold"
            onClick={() => openDialog(null)}
            variant="default"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Add your first word
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-xs font-semibold text-foreground">
          {`Nothing matches “${query.trim()}”`}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((word) => (
            <li
              className="flex flex-col rounded-2xl border-2 border-border/60 bg-popover p-4"
              key={word.id}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-extrabold leading-6 text-foreground">
                  {word.term}
                </p>
                {word.lang ? (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 text-foreground">
                    {word.lang}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-foreground">{word.meaning}</p>
              {word.note ? (
                <p className="mt-2 line-clamp-4 whitespace-pre-line border-t border-border/50 pt-2 text-[11px] leading-4 text-foreground/80">
                  {word.note}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-end gap-0.5 pt-3">
                <Button
                  aria-label={`Pronounce ${word.term}`}
                  className="size-8 rounded-full"
                  onClick={() => pronounce(word)}
                  size="icon"
                  variant="ghost"
                >
                  <Volume2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </Button>
                <Button
                  aria-label={`Edit ${word.term}`}
                  className="size-8 rounded-full"
                  onClick={() => openDialog(word)}
                  size="icon"
                  variant="ghost"
                >
                  <PenLine aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    aria-label={`Remove ${word.term}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Remove this word?</AlertDialogTitle>
                    <AlertDialogDescription className="mt-1.5">
                      {`“${word.term}” will be deleted from this device. It is not stored anywhere else.`}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void erase(word)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit word" : "Add a word"}</DialogTitle>
            <DialogDescription>
              {editing ? `Editing “${editing.term}”.` : "Stored on this device, nothing leaves it."}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-2" onSubmit={onSubmit}>
            <div className="flex gap-2">
              <Input
                aria-label="Word or phrase"
                aria-invalid={fieldError ? true : undefined}
                autoFocus
                className="h-11 text-sm"
                maxLength={120}
                placeholder="Word or phrase"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  if (fieldError) setFieldError(null);
                }}
              />
              <Select onValueChange={(value) => setLang(value ?? "")} value={lang}>
                <SelectTrigger
                  aria-label="Language"
                  className="h-11 w-32 shrink-0 text-xs font-bold"
                >
                  <SelectValue>{(value: string) => langLabel(value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              aria-label="Meaning or translation"
              aria-invalid={fieldError ? true : undefined}
              maxLength={400}
              className="h-11 text-sm"
              placeholder="Meaning or translation"
              value={meaning}
              onChange={(event) => {
                setMeaning(event.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
            <Textarea
              aria-label="Notes about this word"
              className="min-h-20 text-sm"
              maxLength={800}
              placeholder="Write anything about this word…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {fieldError ? (
              <p className="text-[11px] font-semibold text-destructive" role="alert">
                {fieldError}
              </p>
            ) : null}
            <DialogFooter className="mt-1 flex-row items-center justify-end gap-2">
              <Button
                className="h-10 rounded-xl px-4 text-xs font-bold"
                onClick={closeDialog}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                className="h-10 gap-2 rounded-xl px-4 text-xs font-bold"
                disabled={saving}
                type="submit"
                variant="default"
              >
                {saving ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                )}
                {saving ? "Saving…" : editing ? "Save changes" : "Add word"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
