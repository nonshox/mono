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
  const { supported, listening, toggle, engine } = useDictation(value, onChange);
  if (!supported) return null;

  const offline = engine === "whisper";

  return (
    <button
      aria-label={listening ? "Stop dictation" : offline ? "Dictate (offline mode)" : "Dictate"}
      aria-pressed={listening}
      className={cn(
        "relative grid size-7 shrink-0 place-items-center rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
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
      {offline && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 rounded-full border-2 border-border bg-background px-1 text-[8px] font-bold leading-[1.1] text-foreground"
        >
          OFF
        </span>
      )}
    </button>
  );
}

