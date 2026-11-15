"use client";

import { BookOpen, Check, LoaderCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { saveDay, type DayEntry } from "@/features/days/client-api";
import {
  countWords,
  groupJournalEntries,
  highlightParts,
  matchesQuery,
} from "@/features/days/group";
import { getApiErrorMessage } from "@/lib/api-client";
import Link from "next/link";

const weekdayShort = (day: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00.000Z`))
    .toUpperCase();

function monthName(month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(Date.UTC(2026, month - 1, 1)),
  );
}

export function JournalExperience({ entries }: { entries: DayEntry[] }) {
  const [items, setItems] = useState(entries);
  const [query, setQuery] = useState("");
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmedQuery = query.trim();
  const filtered = useMemo(
    () =>
      trimmedQuery
        ? items.filter((entry) => matchesQuery(entry, trimmedQuery))
        : items,
    [items, trimmedQuery],
  );
  const groups = useMemo(() => groupJournalEntries(filtered), [filtered]);
  const totalWords = useMemo(() => countWords(items), [items]);

  const startEdit = (entry: DayEntry) => {
    setDraft(entry.text);
    setEditingDay(entry.day);
  };

  const commit = async () => {
    if (!editingDay || saving) return;
    const text = draft.trim();
    if (!text) return; // Erase happens from the dots; reading mode only edits.
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
        {/* Header */}
        <header className="border-b border-border/60 pb-4">
          <h1 className="type-title text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalWords.toLocaleString()} words · {items.length}{" "}
            {items.length === 1 ? "day" : "days"} — oldest first
          </p>
        </header>

        {/* Search-within */}
        <div className="flex items-center gap-2 border-b border-border/60 py-2">
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
          <section aria-label={String(year)} className="pt-8" key={year}>
            <div className="flex items-end justify-between border-b border-border/60 pb-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                {year}
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {months.reduce((sum, month) => sum + month.entries.length, 0)}{" "}
                days
              </span>
            </div>

            {months.map(({ month, entries: monthEntries }) => (
              <div className="mt-4" key={month}>
                <h3 className="type-eyebrow">{monthName(month)}</h3>
                <ul className="divide-y divide-border/50">
                  {monthEntries.map((entry) => {
                    const isEditing = editingDay === entry.day;
                    return (
                      <li className="flex gap-4 py-3" key={entry.day}>
                        {/* Book margin — day numeral + weekday */}
                        <div aria-hidden="true" className="w-10 shrink-0 select-none pt-0.5">
                          <span className="block text-xl font-extrabold leading-none tracking-tight tabular-nums text-foreground">
                            {Number(entry.day.slice(8))}
                          </span>
                          <span className="type-eyebrow mt-1 block text-muted-foreground/60">
                            {weekdayShort(entry.day)}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="min-w-0 flex-1">
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
                            <div className="mt-1.5 flex items-center justify-end gap-1.5">
                              <button
                                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => setEditingDay(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                              <button
                                aria-busy={saving}
                                className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1 text-xs font-semibold text-background outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
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
                            </div>
                          </div>
                        ) : (
                          <button
                            aria-label={`Edit ${entry.day}`}
                            className="group min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => startEdit(entry)}
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
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
