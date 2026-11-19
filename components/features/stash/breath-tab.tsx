"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { acquireWakeLock, releaseWakeLock } from "@/features/stash/wake-lock";

type PhaseKind = "in" | "hold" | "out";
type Phase = { kind: PhaseKind; seconds: number };
type Pattern = { id: string; label: string; phases: Phase[] };

const PATTERNS: Pattern[] = [
  {
    id: "coherent",
    label: "Coherent · 5-5",
    phases: [
      { kind: "in", seconds: 5 },
      { kind: "out", seconds: 5 },
    ],
  },
  {
    id: "box",
    label: "Box · 4-4-4-4",
    phases: [
      { kind: "in", seconds: 4 },
      { kind: "hold", seconds: 4 },
      { kind: "out", seconds: 4 },
      { kind: "hold", seconds: 4 },
    ],
  },
  {
    id: "sleep",
    label: "Sleep · 4-7-8",
    phases: [
      { kind: "in", seconds: 4 },
      { kind: "hold", seconds: 7 },
      { kind: "out", seconds: 8 },
    ],
  },
  {
    id: "sigh",
    label: "Cyclic sigh · in, in-top-up, long out",
    phases: [
      { kind: "in", seconds: 4 },
      { kind: "in", seconds: 2 },
      { kind: "out", seconds: 9 },
    ],
  },
];

const PHASE_LABEL: Record<PhaseKind, string> = {
  in: "breathe in",
  hold: "hold",
  out: "breathe out",
};

/** Circle scale for a phase — a hold keeps whatever came before it. */
function scaleFor(phases: Phase[], index: number): number {
  let scale = 1;
  for (let i = 0; i <= index; i += 1) {
    if (phases[i].kind === "in") scale = 1.32;
    else if (phases[i].kind === "out") scale = 1;
  }
  return scale;
}

export function BreathTab() {
  const [patternId, setPatternId] = useState("coherent");
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(
    PATTERNS[0].phases[0].seconds * 1000,
  );
  const [cycles, setCycles] = useState(0);

  const pattern = PATTERNS.find((candidate) => candidate.id === patternId) ?? PATTERNS[0];
  const phase = pattern.phases[phaseIndex];
  const phaseTotalMs = phase.seconds * 1000;

  const changePattern = (value: string | null) => {
    if (!value) return;
    const next = PATTERNS.find((candidate) => candidate.id === value);
    if (!next) return;
    setPatternId(value);
    setPhaseIndex(0);
    setCycles(0);
    setRemainingMs(next.phases[0].seconds * 1000);
    setStartedAt(Date.now());
  };

  // Keep the screen awake while breathing — a dimmed/locked screen throttles
  // timers and stalls the pacer.
  useEffect(() => {
    if (running) {
      void acquireWakeLock();
      return () => {
        void releaseWakeLock();
      };
    }
  }, [running]);

  // Tick — drift-free because everything derives from startedAt. Resyncs
  // through as many missed phases as needed, so even a throttled hidden tab
  // lands on the correct phase instead of lagging behind.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      let elapsed = Date.now() - startedAt;
      let index = phaseIndex;
      let start = startedAt;
      let total = phaseTotalMs;
      let wrapped = 0;
      while (elapsed >= total) {
        elapsed -= total;
        index = (index + 1) % pattern.phases.length;
        if (index === 0) wrapped += 1;
        start += total;
        total = pattern.phases[index].seconds * 1000;
      }
      if (index !== phaseIndex) {
        if (wrapped > 0) setCycles((value) => value + wrapped);
        setPhaseIndex(index);
        setStartedAt(start);
      }
      setRemainingMs(total - elapsed);
    }, 100);
    return () => window.clearInterval(id);
  }, [running, startedAt, phaseIndex, phaseTotalMs, pattern.phases]);

  const toggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    // Resume from the frozen remaining time.
    setStartedAt(Date.now() - (phaseTotalMs - remainingMs));
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setPhaseIndex(0);
    setCycles(0);
    setRemainingMs(pattern.phases[0].seconds * 1000);
    setStartedAt(Date.now());
  };

  const scale = scaleFor(pattern.phases, phaseIndex);
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <section aria-label="Breath pacer" className="flex flex-col items-center gap-6 py-4">
      <Select onValueChange={changePattern} value={patternId}>
        <SelectTrigger aria-label="Breathing pattern" className="h-9 rounded-xl text-xs font-semibold">
          <SelectValue>{(value: string) => PATTERNS.find((p) => p.id === value)?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PATTERNS.map((candidate) => (
            <SelectItem key={candidate.id} value={candidate.id}>
              {candidate.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        aria-label={`Current phase: ${PHASE_LABEL[phase.kind]}, ${secondsLeft} seconds left`}
        className="grid size-44 place-items-center rounded-full border-2 border-border/70 bg-popover sm:size-52"
        role="img"
      >
        <div
          className="grid size-32 place-items-center rounded-full bg-foreground/[0.07] transition-transform ease-in-out sm:size-40"
          style={{ transform: `scale(${scale})`, transitionDuration: `${phase.seconds}s` }}
        >
          <span className="type-title text-4xl tabular-nums text-foreground sm:text-5xl">
            {secondsLeft}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p aria-live="polite" className="type-eyebrow text-foreground">
          {PHASE_LABEL[phase.kind]}
        </p>
        <p className="text-[11px] tabular-nums text-foreground">
          {cycles === 0 ? "cycle 1" : `cycle ${cycles + 1}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="h-12 gap-2 rounded-xl px-6 text-xs font-bold"
          onClick={toggle}
          type="button"
        >
          {running ? (
            <Pause aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} />
          )}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          aria-label="Start over"
          className="size-12 rounded-xl"
          onClick={reset}
          size="icon"
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Button>
      </div>

      <p className="max-w-[16rem] text-center text-[11px] leading-5 text-foreground">
        In through the nose, out through the mouth. Longer out-breaths tell the body it is safe.
      </p>
    </section>
  );
}
