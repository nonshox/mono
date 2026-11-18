"use client";

import { Plus, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuggestionsPanel({
  suggestions,
  onAccept,
  onDismiss,
}: {
  suggestions: string[];
  onAccept: (text: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="type-eyebrow">Suggestions</span>
        <Button
          aria-label="Dismiss suggestions"
          className="size-5 rounded-full focus-visible:ring-1"
          onClick={onDismiss}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon aria-hidden="true" className="size-3" strokeWidth={2.2} />
        </Button>
      </div>
      <ul className="mt-1 grid gap-0.5">
        {suggestions.map((text) => (
          <li
            className="flex items-center justify-between gap-1.5 py-0.5"
            key={text}
          >
            <span className="min-w-0 truncate text-[11px] font-medium leading-5 text-foreground">
              {text}
            </span>
            <Button
              aria-label={`Add "${text}"`}
              className="size-6 rounded-full focus-visible:ring-1"
              onClick={() => onAccept(text)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Plus aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
