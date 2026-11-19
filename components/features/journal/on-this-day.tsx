"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchFlashback, type DayEntry } from "@/features/days/client-api";
import { Button } from "@/components/ui/button";

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/**
 * "On this day" — same month-day in earlier years, straight into the feed.
 * Hidden entirely when nothing exists; the server returns at most three.
 */
export function OnThisDay({ today }: { today: string }) {
  const [items, setItems] = useState<DayEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchFlashback(today)
      .then((entries) => active && setItems(entries))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [today]);

  if (items === null) {
    return (
      <div
        aria-hidden="true"
        className="flex items-center gap-2 px-1 py-3 text-[11px] text-foreground/60"
      >
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Looking back…
      </div>
    );
  }
  if (items.length === 0) return null;

  const entry = items[index];
  const showingPast = items.length > 1;

  return (
    <section
      aria-label="On this day in earlier years"
      className="rounded-2xl border-2 border-border/70 bg-popover p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="type-eyebrow flex items-center gap-1.5 text-foreground">
          <BookOpen aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          On this day
        </p>
        {showingPast && (
          <div className="flex items-center gap-0.5">
            <Button
              aria-label="Earlier year"
              className="size-6 rounded-full disabled:opacity-30"
              disabled={index === items.length - 1}
              onClick={() => {
                setIndex((current) => Math.min(items.length - 1, current + 1));
                setExpanded(false);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            </Button>
            <Button
              aria-label="Later year"
              className="size-6 rounded-full disabled:opacity-30"
              disabled={index === 0}
              onClick={() => {
                setIndex((current) => Math.max(0, current - 1));
                setExpanded(false);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
      <Button
        aria-expanded={expanded}
        className="mt-2 h-auto w-full flex-col flex-nowrap items-stretch justify-start gap-0 whitespace-normal px-1 py-1 text-left font-normal hover:bg-muted/40"
        onClick={() => setExpanded((value) => !value)}
        type="button"
        variant="ghost"
      >
        <span className="px-0 text-[11px] font-bold tabular-nums text-foreground">
          {dayLabel(entry.day)}
        </span>
        <span
          className={`mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-foreground ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {entry.text}
        </span>
        {entry.satisfied != null && (
          <span className="mt-1.5 text-[11px] leading-none text-foreground">
            {entry.satisfied}% felt that day
          </span>
        )}
      </Button>
    </section>
  );
}
