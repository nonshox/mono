"use client";

import { Popover } from "@base-ui/react/popover";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  PenLine,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  fetchFlashback,
  searchDays,
  type DayEntry,
} from "@/features/days/client-api";
import { useDaysStore } from "@/features/days/store";
import { getApiErrorMessage } from "@/lib/api-client";
import { MicButton } from "@/components/interface/mic-button";
import { PolishButton } from "@/components/interface/polish-button";

const MAX_LENGTH = 1000;
const COUNTER_AT = 800;

function longLabel(day: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

function shortLabel(day: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

function shortYear(day: string): string {
  return day.slice(0, 4);
}

export function DayDots({
  year: initialYear,
  today,
  entries,
  years,
}: {
  year: number;
  today: string;
  entries: DayEntry[];
  /** Years that contain at least one entry (drives the switcher). */
  years: number[];
}) {
  const thisYear = Number(today.slice(0, 4));
  const hydrate = useDaysStore((state) => state.hydrate);
  const load = useDaysStore((state) => state.load);
  const loading = useDaysStore((state) => state.loading);
  const stored = useDaysStore((state) => state.entries);
  const saving = useDaysStore((state) => state.saving);
  const save = useDaysStore((state) => state.save);
  const remove = useDaysStore((state) => state.remove);

  const [year, setYear] = useState(initialYear);
  // Years the switcher may land on: any year with data, plus the current one.
  const navigable = useMemo(
    () =>
      [...new Set([...years, initialYear])]
        .filter((y) => y <= thisYear)
        .sort((a, b) => a - b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [years, initialYear],
  );
  const navIndex = navigable.indexOf(year);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [flashback, setFlashback] = useState<DayEntry[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DayEntry[]>([]);
  const [searching, setSearching] = useState(false);

  const dotRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingOpen = useRef<string | null>(null);

  // Server-rendered entries seed the store once (current year only).
  useEffect(() => {
    hydrate(initialYear, entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialYear]);

  useEffect(() => {
    load(year).catch(() =>
      toast.error("Year unavailable"),
    );
  }, [year, load]);

  const openFor = (day: string, element: HTMLButtonElement) => {
    if (openDay === day) {
      setOpenDay(null);
      return;
    }
    setAnchor(element);
    setOpenDay(day);
    const existing = useDaysStore.getState().entries[day];
    setDraft(existing ?? "");
    setEditing(existing === undefined);
    setFlashback([]);
  };

  const days = useMemo(() => {
    const list: string[] = [];
    const cursor = new Date(Date.UTC(year, 0, 1));
    while (cursor.getUTCFullYear() === year) {
      list.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return list;
  }, [year]);

  const filled = Object.keys(stored).length;

  useEffect(() => {
    if (!openDay) return;
    let active = true;
    fetchFlashback(openDay)
      .then((items) => active && setFlashback(items))
      .catch(() => active && setFlashback([]));
    return () => {
      active = false;
    };
  }, [openDay]);

  // After a search jump, open the target dot once its year has painted.
  useEffect(() => {
    const day = pendingOpen.current;
    if (!day || loading || Number(day.slice(0, 4)) !== year) return;
    pendingOpen.current = null;
    const id = requestAnimationFrame(() => {
      const element = dotRefs.current.get(day);
      if (element) openFor(day, element);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, loading]);

  // Debounced cross-year search. setState happens in the debounce
  // callback; the effect body only schedules it.
  useEffect(() => {
    const trimmed = query.trim();
    if (!searchOpen || trimmed.length < 2) return;
    const id = setTimeout(() => {
      searchDays(trimmed)
        .then((items) => {
          setResults(items);
          setSearching(false);
        })
        .catch(() => {
          setResults([]);
          setSearching(false);
        });
    }, 200);
    return () => clearTimeout(id);
  }, [query, searchOpen]);

  const updateQuery = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
  };

  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    setQuery("");
    setResults([]);
    setSearching(false);
  };

  const switchYear = (delta: number) => {
    const index = navigable.indexOf(year);
    const next = navigable[(index === -1 ? 0 : index) + delta];
    if (next === undefined || next > thisYear) return;
    setOpenDay(null);
    setYear(next);
  };

  const selectResult = (entry: DayEntry) => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setSearching(false);
    const entryYear = Number(entry.day.slice(0, 4));
    if (entryYear !== year) {
      pendingOpen.current = entry.day;
      setOpenDay(null);
      setYear(entryYear);
      return;
    }
    const element = dotRefs.current.get(entry.day);
    if (element) openFor(entry.day, element);
  };

  // Instant close with optimistic background save — UI never waits.
  const closeAndSave = () => {
    if (!openDay) {
      setOpenDay(null);
      return;
    }
    const day = openDay;
    const text = draft.trim();
    const previous = useDaysStore.getState().entries[day];
    const unchanged = text === (previous ?? "");

    // Close now — save in background; toast only on failure.
    setEditing(false);
    setOpenDay(null);

    if (!editing || unchanged) return;

    void (async () => {
      try {
        if (!text) {
          await remove(day);
          if (previous !== undefined) toast.success("Day cleared");
        } else {
          await save(day, text);
          toast.success("Saved");
        }
      } catch (cause) {
        toast.error(getApiErrorMessage(cause, "Day not saved"));
      }
    })();
  };

  const erase = async () => {
    if (!openDay) return;
    try {
      await remove(openDay);
      setDraft("");
      setEditing(false);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Day not erased"));
    }
  };

  const activeText = openDay ? stored[openDay] : undefined;
  const showCounter = draft.length > COUNTER_AT;
  const trimmedQuery = query.trim();
  const showResults = searchOpen && trimmedQuery.length >= 2;

  return (
    <section aria-label={`${year} — the year in dots`} className="mt-8">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <h2 className="type-eyebrow">{year} dots</h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-1 text-xs tabular-nums text-foreground">
            {filled} / {days.length}
          </span>
          <button
            aria-label="Search your days"
            aria-pressed={searchOpen}
            className="grid size-6 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={toggleSearch}
            type="button"
          >
            <Search aria-hidden="true" className="size-3.5" strokeWidth={2} />
          </button>
          {navigable.length > 1 && (
            <>
              <button
                aria-label="Previous year"
                className="grid size-6 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                disabled={loading || navIndex <= 0}
                onClick={() => switchYear(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Next year"
                className="grid size-6 place-items-center rounded-md text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                disabled={loading || navIndex === navigable.length - 1}
                onClick={() => switchYear(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border/60 py-1.5">
          <Search
            aria-hidden="true"
            className="size-3.5 shrink-0 text-foreground"
            strokeWidth={2}
          />
          <input
            aria-label="Search your days"
            autoFocus
            className="h-6 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results.length > 0) {
                selectResult(results[0]);
              }
              if (event.key === "Escape") {
                if (query) updateQuery("");
                else toggleSearch();
              }
            }}
            placeholder="Search your days, all years…"
            spellCheck={false}
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="grid size-5 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => updateQuery("")}
              type="button"
            >
              <X aria-hidden="true" className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {showResults && (
        <div
          aria-live="polite"
          className="mt-2 max-h-64 divide-y divide-border/50 overflow-y-auto rounded-xl border-2 border-border"
        >
          {searching ? (
            <p className="px-3 py-3 text-xs text-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-foreground">
              No days match “{trimmedQuery}”.
            </p>
          ) : (
            results.map((entry) => (
              <button
                className="block w-full px-3 py-2 text-left outline-none transition hover:bg-muted/60 focus-visible:bg-muted/60"
                key={entry.day}
                onClick={() => selectResult(entry)}
                type="button"
              >
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {shortLabel(entry.day)}
                </span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-foreground">
                  {entry.text}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <div
        className={cn(
          "mt-3 flex flex-wrap gap-[5px] transition-opacity duration-200",
          loading && "pointer-events-none opacity-30",
        )}
      >
        {days.map((day) => {
          const isFilled = stored[day] !== undefined;
          const isFuture = day > today;
          const isToday = day === today;
          return (
            <button
              aria-label={`${longLabel(day)} — ${isFilled ? "written" : isFuture ? "upcoming" : "empty"}`}
              aria-pressed={isFilled}
              className={cn(
                "grid aspect-square size-[1.05rem] place-items-center rounded-full border-2 border-foreground/35 bg-transparent outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring sm:size-[1.2rem]",
                isFilled
                  ? "border-foreground bg-foreground hover:scale-110"
                  : "border-foreground/30 bg-transparent hover:scale-110 hover:border-foreground/70",
                isFuture && "cursor-default border-foreground/10 hover:scale-100 hover:border-foreground/10",
                isToday &&
                "ring-2 ring-(--editorial)/50 ring-offset-2 ring-offset-background",
              )}
              disabled={isFuture}
              key={day}
              onClick={(event) => openFor(day, event.currentTarget)}
              ref={(element) => {
                if (element) {
                  dotRefs.current.set(day, element);
                } else {
                  dotRefs.current.delete(day);
                }
              }}
              type="button"
            />
          );
        })}
      </div>

      <Popover.Root
        onOpenChange={(open) => {
          if (open) return;
          void closeAndSave();
        }}
        open={openDay !== null}
      >
        <Popover.Portal>
          <Popover.Positioner
            align="center"
            anchor={anchor}
            collisionPadding={8}
            side="bottom"
            sideOffset={6}
          >
            <Popover.Popup
              aria-label={openDay ? longLabel(openDay) : undefined}
              className="z-50 w-56 max-w-[calc(100vw-1rem)] rounded-xl border-2 border-border/80 bg-popover p-2.5 outline-none backdrop-blur-xl sm:w-64 sm:p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Popover.Title className="type-label leading-4 text-foreground">
                  {openDay ? longLabel(openDay) : ""}
                </Popover.Title>
                <div className="-mr-1 flex items-center gap-1">
                  <MicButton onChange={setDraft} value={draft} />
                  <PolishButton onChange={setDraft} value={draft} />
                  {activeText && !editing && (
                    <>
                      <button
                        aria-label="Edit"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          setDraft(activeText);
                          setEditing(true);
                        }}
                        type="button"
                      >
                        <PenLine aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                      </button>
                      <button
                        aria-busy={saving}
                        aria-label="Erase"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => void erase()}
                        type="button"
                      >
                        <Eraser aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1.5 min-h-16 overflow-y-auto sm:max-h-48 sm:overflow-visible">
                {editing ? (
                  <div>
                    <textarea
                      autoFocus
                      className="block h-18 w-full resize-none bg-transparent text-xs leading-5 text-foreground outline-none placeholder:text-foreground/50 sm:h-20 sm:text-sm sm:leading-6"
                      maxLength={MAX_LENGTH}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          void closeAndSave();
                        }
                        if (event.key === "Escape") setEditing(false);
                      }}
                      placeholder="What happened today?"
                      value={draft}
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <span
                        className="ml-auto text-[10px] tabular-nums text-foreground sm:text-[11px]"
                      >
                        {showCounter ? `${draft.length} / ${MAX_LENGTH}` : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {activeText ? (
                      <div>
                        <p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-foreground sm:text-sm sm:leading-6">
                          {activeText}
                        </p>
                      </div>
                    ) : (
                      <div className="py-0.5">
                        <p className="type-label text-muted-foreground/70">
                          Nothing yet.
                        </p>
                        <button
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70 outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
                          onClick={() => setEditing(true)}
                          type="button"
                        >
                          <PenLine aria-hidden="true" className="size-3" strokeWidth={2} />
                          Write this day
                        </button>
                      </div>
                    )}

                    {flashback.length > 0 && (
                      <div className="mt-1.5">
                        <p className="type-label text-[11px]">On this day</p>
                        <ul className="mt-1 grid gap-1">
                          {flashback.map((entry) => (
                            <li className="min-w-0" key={entry.day}>
                              <span className="text-[11px] font-bold tabular-nums text-foreground">
                                {shortYear(entry.day)}
                              </span>
                              <p className="line-clamp-2 text-[11px] leading-4 text-foreground">
                                {entry.text}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}




