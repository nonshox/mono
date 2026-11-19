"use client";

import { BookOpen, Check, ChevronDown, Eraser, LoaderCircle, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteDay, saveDay, type DayEntry } from "@/features/days/client-api";
import { groupJournalEntries, matchesQuery } from "@/features/days/group";
import { searchDays, fetchYearDays } from "@/features/days/client-api";
import { ThemesRow, EntryRow } from "@/components/features/journal/journal-entry";
import { extractThemes } from "@/features/days/themes";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MicButton } from "@/components/shared/mic-button";
import { PolishButton } from "@/components/shared/polish-button";
import { JournalHeader } from "@/components/features/journal/journal-header";
import { TodayStrip } from "@/components/features/journal/today-strip";
import { OnThisDay } from "@/components/features/journal/on-this-day";
import type { CompletedBook } from "@/features/books/client-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

function shortLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}



export function JournalExperience({
  entries,
  books,
  years,
  today,
}: {
  entries: DayEntry[];
  books: CompletedBook[];
  /** Every year with at least one entry, ascending. */
  years: number[];
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [items, setItems] = useState(entries);
  // Today's entry as the feed sees it — starts as the server-rendered seed,
  // then follows TodayStrip saves so the writer never shows stale text.
  const currentToday = items.find((item) => item.day === today)?.text ?? null;
  // Feed stays truthful after a Today save — upsert or drop today's row.
  const onTodaySaved = (text: string) => {
    setItems((prev) => {
      const rest = prev.filter((item) => item.day !== today);
      if (!text) return rest;
      const existing = prev.find((item) => item.day === today);
      return [...rest, { day: today, text, satisfied: existing?.satisfied ?? null }]
        .sort((a, b) => a.day.localeCompare(b.day));
    });
  };
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const [loadedYears, setLoadedYears] = useState<number[]>(() =>
    years.length > 0 ? [years[years.length - 1]] : [],
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [searchResults, setSearchResults] = useState<DayEntry[] | null>(null);

  // Back/forward (or an external ?q= link) re-syncs the input during render.
  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  // Debounce the query into the URL so refresh/share restores the filter.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const next = query.trim();
      if (next) params.set("q", next);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmedQuery = query.trim();

  // Global search — hits /api/days/search when there is a real query, so
  // results span every year, not just the loaded window.
  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      const q = trimmedQuery;
      if (q.length < 2) {
        if (active) setSearchResults(null);
        return;
      }
      searchDays(q)
        .then((found) => active && setSearchResults(found))
        .catch(() => active && setSearchResults(null));
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [trimmedQuery]);

  // Local matches for instant feedback; server results replace them once in.
  const localFiltered = useMemo(
    () =>
      trimmedQuery
        ? items.filter((entry) => matchesQuery(entry, trimmedQuery))
        : items,
    [items, trimmedQuery],
  );
  const filtered = useMemo(
    () =>
      trimmedQuery
        ? [...(searchResults ?? localFiltered)].sort((a, b) =>
            a.day.localeCompare(b.day),
          )
        : items,
    [trimmedQuery, searchResults, localFiltered, items],
  );
  const groups = useMemo(() => groupJournalEntries(filtered), [filtered]);

  // Themes from the last 30 days of entries (data-derived, no clock).
  const themes = useMemo(() => {
    const latest = items[items.length - 1]?.day;
    if (!latest) return [];
    const start = new Date(new Date(`${latest}T00:00:00.000Z`).getTime() - 29 * 86400000)
      .toISOString()
      .slice(0, 10);
    return extractThemes(items.filter((entry) => entry.day >= start));
  }, [items]);

  const toggleExpand = (day: string) => {
    // Auto-save on close — collapse persists dirty drafts.
    if (editingDay) void commit();
    setExpandedDay((prev) => (prev === day ? null : day));
    setEditingDay(null);
  };

  const startEdit = (entry: DayEntry) => {
    setDraft(entry.text);
    setEditingDay(entry.day);
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
      toast.error(getApiErrorMessage(cause, "Day not saved"));
    } finally {
      setSaving(false);
    }
  };

  const erase = async () => {
    if (!expandedDay || saving) return;
    setSaving(true);
    try {
      await deleteDay(expandedDay);
      setItems((prev) => prev.filter((item) => item.day !== expandedDay));
      setExpandedDay(null);
      setEditingDay(null);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Day not erased"));
    } finally {
      setSaving(false);
    }
  };

  const olderYears = years.filter((year) => !loadedYears.includes(year));
  const nextOlderYear = olderYears.length > 0 ? olderYears[olderYears.length - 1] : null;

  const loadEarlierYears = async () => {
    if (nextOlderYear === null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await fetchYearDays(nextOlderYear);
      setItems((prev) =>
        [...prev, ...older].sort((a, b) => a.day.localeCompare(b.day)),
      );
      setLoadedYears((prev) => [...prev, nextOlderYear].sort((a, b) => a - b));
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Could not load that year"));
    } finally {
      setLoadingOlder(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-full w-full bg-background px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <h1 className="sr-only">Journal</h1>
        <div className="mx-auto flex w-full max-w-2xl flex-col md:max-w-3xl">
          <JournalHeader
            initialBooks={books}
            matches={0}
            onQueryChange={() => undefined}
            query=""
            showSearch={false}
            total={0}
          />
          <div className="mt-3 flex flex-col gap-3">
            <TodayStrip initialText={currentToday} onSaved={onTodaySaved} today={today} />
            <OnThisDay today={today} />
          </div>
          <div className="flex flex-col items-center gap-3 pt-12 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
              <BookOpen aria-hidden="true" className="size-6" strokeWidth={1.5} />
            </span>
            <p className="text-sm font-semibold text-foreground">Nothing written yet</p>
            <p className="max-w-xs text-xs leading-relaxed text-foreground">
              Your first dot starts right here.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <h1 className="sr-only">Journal</h1>
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        <JournalHeader
          initialBooks={books}
          matches={filtered.length}
          onQueryChange={setQuery}
          query={query}
          total={items.length}
        />

        <div className="mt-3 flex flex-col gap-3">
          <TodayStrip initialText={currentToday} onSaved={onTodaySaved} today={today} />
          <OnThisDay today={today} />
        </div>

        <ThemesRow onSelectTheme={setQuery} themes={themes} />

        {groups.length === 0 && (
          <p className="px-0.5 py-10 text-center text-sm text-foreground">
            No days match “{trimmedQuery}”.
          </p>
        )}

        {groups.map(({ year, months }) => (
          <section aria-label={String(year)} className="pt-6" key={year}>
            <div aria-hidden="true" className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border/70" />
              <h2 className="type-label">{year}</h2>
              <span className="h-px flex-1 bg-border/70" />
            </div>

            <ul className="mt-1.5 space-y-1.5">
              {months.flatMap((month) => month.entries).map((entry) => {
                const isExpanded = expandedDay === entry.day;
                const isEditing = editingDay === entry.day;
                return (
                  <li key={entry.day}>
                    {!isExpanded ? (
                      <EntryRow entry={entry} onOpen={toggleExpand} query={trimmedQuery} />
                    ) : (
                      /* Expanded — solid card in place: date, words, actions */
                      <div className="min-w-0 overflow-hidden rounded-xl border-2 border-border/80 bg-popover">
                        <div className="flex items-center justify-between gap-2 py-1.5 pl-3 pr-1">
                          <p className="type-label leading-4 text-foreground">
                            {shortLabel(entry.day)}
                          </p>
                          <div className="flex items-center gap-1">
                            {isEditing && (
                              <>
                                <MicButton onChange={setDraft} value={draft} />
                                <PolishButton onChange={setDraft} value={draft} />
                                <Button
                                  aria-label="Discard changes"
                                  className="size-7 rounded-full border-border hover:text-destructive"
                                  onClick={() => setEditingDay(null)}
                                  size="icon"
                                  type="button"
                                  variant="outline"
                                >
                                  <X aria-hidden="true" className="size-3.5" strokeWidth={2} />
                                </Button>
                                <Button
                                  aria-busy={saving}
                                  aria-label="Save"
                                  className="size-7 rounded-full border-border disabled:opacity-40"
                                  disabled={saving || !draft.trim()}
                                  onClick={() => void commit()}
                                  size="icon"
                                  type="button"
                                  variant="outline"
                                >
                                  {saving ? (
                                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                                  ) : (
                                    <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                                  )}
                                </Button>
                              </>
                            )}
                            {!isEditing && (
                              <>
                                <Button
                                  aria-label="Edit"
                                  className="size-7 rounded-full border-border"
                                  onClick={() => startEdit(entry)}
                                  size="icon"
                                  type="button"
                                  variant="outline"
                                >
                                  <PenLine aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    aria-label="Erase this day"
                                    aria-busy={saving}
                                    className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                                  >
                                    <Eraser aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogTitle>Erase {shortLabel(entry.day)}?</AlertDialogTitle>
                                    <AlertDialogDescription className="mt-1.5">
                                      This entry will be deleted permanently. This cannot be undone.
                                    </AlertDialogDescription>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => void erase()}>
                                        Erase
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            <Button
                              aria-label="Close"
                              className="size-7 rounded-full border-border"
                              onClick={() => toggleExpand(entry.day)}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <X aria-hidden="true" className="size-3.5" strokeWidth={2} />
                            </Button>
                          </div>
                        </div>

                        <div className="px-3 py-2">
                          {isEditing ? (
                            <Textarea
                              autoFocus
                              className="block min-h-24 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-7 focus-visible:border-transparent focus-visible:ring-0 md:text-[15px]"
                              maxLength={1000}
                              onChange={(event) => setDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  (event.metaKey || event.ctrlKey)
                                ) {
                                  void commit();
                                }
                                if (event.key === "Escape") {
                                  setEditingDay(null);
                                }
                              }}
                              rows={Math.max(3, Math.ceil(entry.text.length / 40) || 1)}
                              value={draft}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">
                              {entry.text}
                            </p>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex items-center justify-end px-3 pb-1.5">
                            <span
                              className={`text-[10px] tabular-nums ${
                                draft.length >= 800 ? "text-destructive" : "text-foreground"
                              }`}
                            >
                              {draft.length} / 1000
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {!trimmedQuery && nextOlderYear !== null && (
          <div className="flex flex-col items-center gap-1.5 pb-4 pt-6">
            <Button
              className="h-11 gap-2 rounded-xl border-2 px-5 text-xs font-bold disabled:opacity-50"
              disabled={loadingOlder}
              onClick={() => void loadEarlierYears()}
              type="button"
              variant="outline"
            >
              {loadingOlder ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-4" strokeWidth={2} />
              )}
              Load earlier years
            </Button>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
              {olderYears.length === 1
                ? "1 earlier year available"
                : `${olderYears.length} earlier years available`}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}




