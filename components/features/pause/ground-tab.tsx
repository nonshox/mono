"use client";

import { Check, RotateCcw, Sprout } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { count: 5, sense: "things you can see", hint: "Ceiling, shoe, window — name them without judging." },
  { count: 4, sense: "things you can feel", hint: "Chair, floor, fabric, moving air on skin." },
  { count: 3, sense: "things you can hear", hint: "Traffic, a fan, your own out-breath." },
  { count: 2, sense: "things you can smell", hint: "Coffee, rain, soap — or notice the absence." },
  { count: 1, sense: "thing you can taste", hint: "Last meal, mint, or just your mouth." },
] as const;

/** 5-4-3-2-1 grounding — for anxious moments. Nothing stored, nothing sent. */
export function GroundTab() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const current = STEPS[step];

  const reset = () => {
    setStep(0);
    setDone(false);
  };

  if (done) {
    return (
      <section
        aria-label="Grounding complete"
        className="flex flex-col items-center gap-4 py-12 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
          <Check aria-hidden="true" className="size-6" strokeWidth={2} />
        </span>
        <div>
          <p className="type-title text-foreground">You&apos;re here</p>
          <p className="mt-1 max-w-[18rem] text-xs leading-5 text-foreground">
            Notice your feet on the floor and take one slow breath before you go.
          </p>
        </div>
        <Button
          className="h-10 gap-2 rounded-xl px-5 text-xs font-bold"
          onClick={reset}
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Again
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="5-4-3-2-1 grounding" className="flex flex-col items-center gap-6 py-6">
      {/* Progress dots */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {STEPS.map((entry, index) => (
          <span
            className={`size-2 rounded-full transition-colors ${
              index < step ? "bg-foreground" : index === step ? "bg-foreground/60" : "bg-muted"
            }`}
            key={entry.count}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-muted text-foreground">
          <Sprout aria-hidden="true" className="size-7" strokeWidth={1.5} />
        </span>
        <p className="type-title text-7xl tabular-nums leading-none text-foreground">
          {current.count}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{current.sense}</p>
        <p className="max-w-[16rem] text-[11px] leading-5 text-foreground">{current.hint}</p>
      </div>

      <Button
        className="h-12 rounded-xl px-8 text-xs font-bold"
        onClick={() => {
          if (step === STEPS.length - 1) setDone(true);
          else setStep((value) => value + 1);
        }}
        type="button"
      >
        {step === STEPS.length - 1 ? "Land" : "Next"}
      </Button>

      <p className="text-[11px] text-foreground">
        Step {step + 1} of {STEPS.length} — tap through slowly, out loud if you can.
      </p>
    </section>
  );
}
