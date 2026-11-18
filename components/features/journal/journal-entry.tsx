"use client";

import { Button } from "@/components/ui/button";
import { highlightParts } from "@/features/days/group";
import type { Theme } from "@/features/days/themes";
import type { DayEntry } from "@/features/days/client-api";

/** Last-30-days theme chips — one tap seeds the search. */
export function ThemesRow({
  themes,
  onSelectTheme,
}: {
  themes: Theme[];
  onSelectTheme: (label: string) => void;
}) {
  if (themes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-0.5 py-2">
      <span className="type-label">last 30 days</span>
      {themes.map((theme, index) => (
        <span className="inline-flex items-baseline gap-2" key={theme.label}>
          <Button
            className="h-auto p-0 text-left type-label no-underline hover:no-underline hover:opacity-70"
            onClick={() => onSelectTheme(theme.label)}
            type="button"
            variant="link"
          >
            {theme.label}
          </Button>
          {index < themes.length - 1 && (
            <span aria-hidden="true" className="type-label text-foreground">
              ·
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Collapsed entry — only the words; tap anywhere to expand. */
export function EntryRow({
  entry,
  query,
  onOpen,
}: {
  entry: DayEntry;
  /** Active search query; highlights matches when non-empty. */
  query: string;
  onOpen: (day: string) => void;
}) {
  return (
    <Button
      aria-expanded={false}
      aria-label={`Open ${entry.day}`}
      className="h-auto w-full justify-start whitespace-normal rounded-sm p-0 text-left hover:bg-transparent hover:opacity-70"
      onClick={() => onOpen(entry.day)}
      type="button"
      variant="ghost"
    >
      <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">
        {query
          ? highlightParts(entry.text, query).map((part, index) =>
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
    </Button>
  );
}
