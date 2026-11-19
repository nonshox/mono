"use client";

import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { acquireWakeLock, releaseWakeLock } from "@/features/stash/wake-lock";
import { stashAudio } from "@/features/stash/audio";

type PhaseKind = "in" | "hold" | "out";
type Phase = { kind: PhaseKind; seconds: number };
type Pattern = { id: string; label: string; phases: Phase[] };

const PATTERNS: Pattern[] = [
  {
    id: "coherent",
    label: "Calm · 5-5",
    phases: [
      { kind: "in", seconds: 5 },
      { kind: "out", seconds: 5 },
    ],
  },
  {
    id: "box",
    label: "Focus · 4-4-4-4",
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
    label: "Reset · sigh",
    phases: [
      { kind: "in", seconds: 4 },
      { kind: "in", seconds: 2 },
      { kind: "out", seconds: 9 },
    ],
  },
];

const ROUNDS = [
  { id: "endless", label: "∞" },
  { id: "3", label: "3" },
  { id: "6", label: "6" },
  { id: "10", label: "10" },
] as const;
type Rounds = (typeof ROUNDS)[number]["id"];

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

const RING_RADIUS = 94;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Fresh pacer state for a pattern — `now` is injected by the caller. */
function freshBreath(nextPattern: Pattern, now: number) {
  return {
    phaseIndex: 0,
    cycles: 0,
    done: false,
    remainingMs: nextPattern.phases[0].seconds * 1000,
    startedAt: now,
  };
}

export function BreathTab() {
  const [patternId, setPatternId] = useState("coherent");
  const [rounds, setRounds] = useState<Rounds>("endless");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(
    PATTERNS[0].phases[0].seconds * 1000,
  );
  const [cycles, setCycles] = useState(0);

  const pattern =
    PATTERNS.find((candidate) => candidate.id === patternId) ?? PATTERNS[0];
  const phase = pattern.phases[phaseIndex];
  const phaseTotalMs = phase.seconds * 1000;
  const roundsTarget = rounds === "endless" ? null : Number(rounds);

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
        if (wrapped > 0) {
          const nextCycles = cycles + wrapped;
          setCycles(nextCycles);
          if (roundsTarget !== null && nextCycles >= roundsTarget) {
            setRunning(false);
            setDone(true);
            stashAudio.playChime();
            try {
              navigator.vibrate?.([120]);
            } catch {
              // No haptics — the chime already played.
            }
          }
        }
        setPhaseIndex(index);
        setStartedAt(start);
      }
      setRemainingMs(total - elapsed);
    }, 100);
    return () => window.clearInterval(id);
  }, [running, startedAt, phaseIndex, phaseTotalMs, pattern.phases, cycles, roundsTarget]);

  const applyFresh = (next: Pattern, now: number) => {
    const fresh = freshBreath(next, now);
    setPatternId(next.id);
    setPhaseIndex(fresh.phaseIndex);
    setCycles(fresh.cycles);
    setDone(fresh.done);
    setRemainingMs(fresh.remainingMs);
    setStartedAt(fresh.startedAt);
  };

  const changePattern = (value: string) => {
    const next = PATTERNS.find((candidate) => candidate.id === value);
    if (!next) return;
    setPatternId(value);
    // eslint-disable-next-line react-hooks/purity -- event-time, not render-time
    const now = Date.now();
    applyFresh(next, now);
  };

  const changeRounds = (value: Rounds) => {
    setRounds(value);
    // eslint-disable-next-line react-hooks/purity -- event-time, not render-time
    const now = Date.now();
    applyFresh(pattern, now);
  };

  const reset = () => {
    // eslint-disable-next-line react-hooks/purity -- event-time, not render-time
    const now = Date.now();
    applyFresh(pattern, now);
  };

  const toggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    // Resume from the frozen remaining time.
    setStartedAt(Date.now() - (phaseTotalMs - remainingMs));
    setDone(false);
    setRunning(true);
  };

  const scale = scaleFor(pattern.phases, phaseIndex);
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));
  const phaseProgress = 1 - remainingMs / phaseTotalMs;
  const dashOffset = RING_CIRCUMFERENCE * (1 - phaseProgress);

  return (
    <section
      aria-label="Breath pacer"
      className="flex flex-col items-center gap-5 py-2"
    >
      {/* Pattern chips */}
      <div
        aria-label="Breathing pattern"
        className="flex flex-wrap items-center justify-center gap-1.5"
        role="radiogroup"
      >
        {PATTERNS.map((candidate) => (
          <Button
            aria-checked={patternId === candidate.id}
            className="h-8 rounded-full border-2 px-3 text-[11px] font-bold"
            key={candidate.id}
            onClick={() => changePattern(candidate.id)}
            role="radio"
            type="button"
            variant={patternId === candidate.id ? "default" : "outline"}
          >
            {candidate.label}
          </Button>
        ))}
      </div>

      {/* Pacer + phase ring */}
      <div
        aria-label={`Current phase: ${PHASE_LABEL[phase.kind]}, ${secondsLeft} seconds left`}
        className="relative grid size-56 place-items-center sm:size-64"
        role="img"
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full -rotate-90"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            fill="none"
            r={RING_RADIUS}
            stroke="currentColor"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeOpacity="0.14"
            strokeWidth="3"
          />
          <circle
            cx="120"
            cy="120"
            fill="none"
            r={RING_RADIUS}
            stroke="currentColor"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeOpacity="0.7"
            strokeWidth="3"
          />
        </svg>
        <div className="grid size-40 place-items-center rounded-full border-2 border-border/70 bg-popover sm:size-48">
          <div
            className="grid size-32 place-items-center rounded-full bg-foreground/[0.07] transition-transform ease-in-out sm:size-40"
            style={{
              transform: `scale(${scale})`,
              transitionDuration: `${phase.seconds}s`,
            }}
          >
            {done ? (
              <Check
                aria-hidden="true"
                className="size-12 text-foreground sm:size-14"
                strokeWidth={1.5}
              />
            ) : (
              <span className="type-title text-5xl tabular-nums text-foreground sm:text-6xl">
                {secondsLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phase + cycle */}
      <div className="flex h-5 items-center gap-2.5">
        {done ? (
          <p aria-live="polite" className="type-eyebrow text-foreground">
            done · {roundsTarget} rounds
          </p>
        ) : (
          <>
            <p aria-live="polite" className="type-eyebrow text-foreground">
              {PHASE_LABEL[phase.kind]}
            </p>
            <span aria-hidden="true" className="size-1 rounded-full bg-foreground/40" />
            <p className="text-[11px] tabular-nums text-foreground">
              {roundsTarget === null
                ? `cycle ${cycles + 1}`
                : `${Math.min(cycles + 1, roundsTarget)} of ${roundsTarget}`}
            </p>
          </>
        )}
      </div>

      {/* Rounds */}
      <div
        aria-label="Rounds"
        className="flex items-center gap-2"
        role="radiogroup"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          rounds
        </span>
        {ROUNDS.map((option) => (
          <Button
            aria-checked={rounds === option.id}
            className="size-9 rounded-full border-2 px-0 text-[11px] font-bold"
            key={option.id}
            onClick={() => changeRounds(option.id)}
            role="radio"
            size="icon"
            type="button"
            variant={rounds === option.id ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          className="h-12 gap-2 rounded-2xl px-8 text-xs font-bold"
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
          className="size-12 rounded-2xl"
          onClick={reset}
          size="icon"
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Button>
      </div>
    </section>
  );
}
