"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP = 20;

/** Stepped fader — no raw range input, thumb-friendly, matches the house style. */
export function VolumeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (volume: number) => void;
}) {
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label={`Lower ${label}`}
        className="size-7 rounded-full"
        onClick={() => onChange(clamp(value - STEP))}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Minus aria-hidden="true" className="size-4" strokeWidth={2} />
      </Button>
      <div
        aria-label={`${label} ${value}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
        role="meter"
      >
        <div
          className="h-full rounded-full bg-foreground/75 transition-all duration-200"
          style={{ width: `${value}%` }}
        />
      </div>
      <Button
        aria-label={`Raise ${label}`}
        className="size-7 rounded-full"
        onClick={() => onChange(clamp(value + STEP))}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
      </Button>
      <span className="w-9 text-right text-[11px] tabular-nums text-foreground">
        {value}%
      </span>
    </div>
  );
}
