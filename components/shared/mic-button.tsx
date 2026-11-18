"use client";

import { Mic, Square } from "lucide-react";
import { useDictation } from "@/features/dictation/use-dictation";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

/**
 * Hold-to-talk dictation: press and hold (mouse / touch / space) to dictate,
 * release to stop. Hidden where the Web Speech API is unavailable.
 */
export function MicButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { supported, listening, start, stop } = useDictation(value, onChange);
  if (!supported) return null;

  return (
    <Button
      aria-label={listening ? "Release to stop dictation" : "Hold to dictate"}
      aria-pressed={listening}
      className={cn(
        "size-7 touch-none select-none rounded-full",
        listening
          ? "animate-pulse border-foreground bg-foreground text-background hover:bg-foreground/85"
          : "",
      )}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        if (event.repeat) return; // holding the key fires repeated keydowns
        event.preventDefault();
        start();
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (listening) stop();
      }}
      onPointerCancel={() => {
        if (listening) stop();
      }}
      onPointerDown={(event) => {
        // Left button only — ignore right-click drags.
        if (event.button !== 0) return;
        event.preventDefault();
        start();
      }}
      onPointerLeave={() => {
        if (listening) stop();
      }}
      onPointerUp={() => {
        if (listening) stop();
      }}
      type="button"
      variant="outline"
    >
      {listening ? (
        <Square aria-hidden="true" className="size-3 fill-current" />
      ) : (
        <Mic aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      )}
    </Button>
  );
}
