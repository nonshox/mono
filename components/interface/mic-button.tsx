"use client";

import { Mic, Square } from "lucide-react";
import { useDictation } from "@/features/dictation/use-dictation";
import { cn } from "cn";

/** Small round dictation toggle; hidden entirely where the Web Speech API is unavailable. */
export function MicButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { supported, listening, toggle } = useDictation(value, onChange);
  if (!supported) return null;

  return (
    <button
      aria-label={listening ? "Stop dictation" : "Dictate"}
      aria-pressed={listening}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        listening
          ? "animate-pulse border-foreground bg-foreground text-background"
          : "border-border text-foreground hover:bg-muted",
      )}
      onClick={toggle}
      type="button"
    >
      {listening ? (
        <Square aria-hidden="true" className="size-3 fill-current" />
      ) : (
        <Mic aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
