"use client";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/shared/progress-ring";
import { longLabel } from "./day-labels";
import type { MutableRefObject } from "react";

/**
 * The 365-dot year grid â€” purely presentational. Store reads and popover
 * behaviour stay in the parent; this gets primitives + one open callback.
 */
export function DayDotsGrid({
  days,
  stored,
  satisfied,
  today,
  progressView,
  loading,
  onOpen,
  dotRefs,
}: {
  days: string[];
  stored: Record<string, string>;
  satisfied: Record<string, number>;
  today: string;
  progressView: boolean;
  loading: boolean;
  onOpen: (day: string, element: HTMLButtonElement) => void;
  dotRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  return (
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
        const daySatisfied = satisfied[day];
        return (
          <Button
            aria-label={`${longLabel(day)} â€” ${
              isFilled
                ? daySatisfied !== undefined
                  ? `closed at ${daySatisfied}%`
                  : "written"
                : isFuture
                  ? "upcoming"
                  : "empty"
            }`}
            aria-pressed={isFilled}
            className={cn(
              "grid aspect-square h-auto size-[1.05rem] place-items-center rounded-full bg-transparent p-0 outline-none transition-all duration-150 hover:bg-transparent sm:size-[1.2rem]",
              progressView
                ? "text-foreground hover:scale-110"
                : cn(
                    "border-2",
                    isFilled
                      ? "border-foreground bg-foreground hover:bg-foreground hover:scale-110"
                      : "border-foreground/30 hover:scale-110 hover:border-foreground/70",
                    isFuture &&
                      "cursor-default border-foreground/10 hover:scale-100 hover:border-foreground/10",
                  ),
              progressView &&
                isFuture &&
                "cursor-default text-foreground/15 hover:scale-100",
              isToday &&
                "ring-2 ring-(--editorial)/50 ring-offset-2 ring-offset-background",
            )}
            disabled={isFuture}
            key={day}
            onClick={(event) => onOpen(day, event.currentTarget)}
            ref={(element) => {
              if (element) {
                dotRefs.current.set(day, element);
              } else {
                dotRefs.current.delete(day);
              }
            }}
            type="button"
          >
            {progressView && (
              <ProgressRing
                className="size-full"
                percent={isFilled ? (daySatisfied ?? 100) : 0}
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}
