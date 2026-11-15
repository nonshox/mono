"use client";

import { BookOpen, Check, Eraser, LoaderCircle, PenLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { deleteDay, saveDay, type DayEntry } from "@/features/days/client-api";
import {
  groupJournalEntries,
  highlightParts,
  matchesQuery,
} from "@/features/days/group";
import { getApiErrorMessage } from "@/lib/api-client";
import Link from "next/link";

function fullLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}



export function JournalExperience({ entries }: { entries: DayEntry[] }) {
  const [items, setItems] = useState(entries);
  const [query, setQuery] = useState("");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [eraseArmed, setEraseArmed] = useState(false);

  const trimmedQuery = query.trim();
  const filtered = useMemo(
    () =>
      trimmedQuery
        ? items.filter((entry) => matchesQuery(entry, trimmedQuery))
        : items,
    [items, trimmedQuery],
  );
  const groups = useMemo(() => groupJournalEntries(filtered), [filtered]);

  const toggleExpand = (day: string) => {
    setExpandedDay((prev) => (prev === day ? null : day));
    setEditingDay(null);
    setEraseArmed(false);
  };

  const startEdit = (entry: DayEntry) => {
    setDraft(entry.text);
    setEditingDay(entry.day);
    setEraseArmed(false);
  };

  // Escape closes an expanded card (not while typing an edit).
  useEffect(() => {
    if (!expandedDay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editingDay) setExpandedDay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedDay, editingDay]);

  const commit = async () => {
    if (!editingDay || saving) return;
    const text = draft.trim();
    if (!text) return; // Erase is its own two-step action.
    setSaving(true);
    try {
      const saved = await saveDay(editingDay, text);
      setItems((prev) =>
        prev.map((item) =>
          item.day === saved.day ? { ...item, text: saved.text } : item,
        ),
      );
      setEditingDay(null);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "That day could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const erase = async () => {
    if (!expandedDay || saving) return;
    if (!eraseArmed) {
      setEraseArmed(true);
      return;
    }
    setSaving(true);
    try {
      await deleteDay(expandedDay);
      setItems((prev) => prev.filter((item) => item.day !== expandedDay));
      setExpandedDay(null);
      setEditingDay(null);
      setEraseArmed(false);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "That day could not be erased."));
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-full w-full bg-white px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 pt-16 text-center md:max-w-3xl">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <BookOpen aria-hidden="true" className="size-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm font-semibold text-foreground">Nothing written yet</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Your days gather here in order — write your first dot on the home page.
          </p>
          <Link
            className="mt-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            Go to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Search-within — the only chrome on the page */}
        <div className="flex items-center gap-2 pb-2 pt-1">
          <Search
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground/70"
            strokeWidth={2}
          />
          <input
            aria-label="Search your journal"
            className="h-6 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Search your journal…"
            spellCheck={false}
            value={query}
          />
          {trimmedQuery && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {filtered.length} / {items.length}
            </span>
          )}
          {query && (
            <button
              aria-label="Clear search"
              className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setQuery("")}
              type="button"
            >
              <X aria-hidden="true" className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {groups.length === 0 && (
          <p className="px-0.5 py-10 text-center text-sm text-muted-foreground">
            No days match “{trimmedQuery}”.
          </p>
        )}

        {groups.map(({ year, months }) => (
          <section aria-label={String(year)} className="pt-6" key={year}>
            <div aria-hidden="true" className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border/70" />
              <h2 className="type-eyebrow">{year}</h2>
              <span className="h-px flex-1 bg-border/70" />
            </div>

            <ul className="mt-1.5 space-y-1.5">
              {months.flatMap((month) => month.entries).map((entry) => {
                const isExpanded = expandedDay === entry.day;
                const isEditing = editingDay === entry.day;
                return (
                  <li key={entry.day}>
                    {!isExpanded ? (
                      /* Collapsed — nothing but the words; tap to open */
                      <button
                        aria-expanded={false}
                        aria-label={`Open ${entry.day}`}
                        className="block w-full rounded-sm text-left outline-none transition-opacity hover:opacity-70 focus-visible:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleExpand(entry.day)}
                        type="button"
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                          {trimmedQuery
                            ? highlightParts(entry.text, trimmedQuery).map((part, index) =>
                                part.match ? (
                                  <mark
                                    className="rounded-[3px] bg-foreground/10 text-foreground"
                                    key={index}
                                  >
                                    {part.text}
                                  </mark>
                                ) : (
                                  <span key={index}>{part.text}</span>
                                ),
                              )
                            : entry.text}
                        </p>
                      </button>
                    ) : (
                      /* Expanded — separate glassy card: date, words, actions */
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-popover/80 shadow-lg shadow-foreground/5 backdrop-blur-xl">
                            <div className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 pl-3.5 pr-1.5">
                              <p className="type-eyebrow">{fullLabel(entry.day)}</p>
                              <button
                                aria-label="Close"
                                aria-expanded={true}
                                className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => toggleExpand(entry.day)}
                                type="button"
                              >
                                <X aria-hidden="true" className="size-3.5" strokeWidth={2} />
                              </button>
                            </div>

                            <div className="px-3.5 py-2.5">
                              {isEditing ? (
                                <textarea
                                  autoFocus
                                  className="block w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none"
                                  maxLength={1000}
                                  onChange={(event) => setDraft(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" &&
                                      (event.metaKey || event.ctrlKey)
                                    ) {
                                      void commit();
                                    }
                                    if (event.key === "Escape") setEditingDay(null);
                                  }}
                                  rows={Math.max(3, entry.text.split("\n").length + 1)}
                                  value={draft}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                  {entry.text}
                                </p>
                              )}
                            </div>

                            <div className="border-t border-border/50 px-2 py-1.5 flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => setEditingDay(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    aria-busy={saving}
                                    className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                                    disabled={saving || !draft.trim()}
                                    onClick={() => void commit()}
                                    type="button"
                                  >
                                    {saving ? (
                                      <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
                                    ) : (
                                      <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
                                    )}
                                    Save
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => startEdit(entry)}
                                    type="button"
                                  >
                                    <PenLine aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                                    Edit
                                  </button>
                                  <button
                                    aria-busy={saving}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                                      eraseArmed
                                        ? "bg-destructive/10 text-destructive"
                                        : "text-muted-foreground hover:bg-muted hover:text-destructive"
                                    }`}
                                    onClick={() => void erase()}
                                    type="button"
                                  >
                                    <Eraser aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                                    {eraseArmed ? "Confirm erase" : "Erase"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
