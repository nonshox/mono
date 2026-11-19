"use client";

import { LoaderCircle, MoonStar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Button } from "@/components/ui/button";
import { useCheckStore } from "@/features/check/store";

// Satisfaction is an evening practice only — before 6pm the button stays disabled.
const SATISFY_AFTER_HOUR = 18;

function canSatisfy(): boolean {
  return new Date().getHours() >= SATISFY_AFTER_HOUR;
}

/**
 * The daily ritual's payoff — a full-width evening moment, not a tiny corner
 * pill. Disabled before 6pm; once the day is closed it becomes the reminder
 * that rest is the reward.
 */
export function EndDayButton() {
  const items = useCheckStore((state) => state.items);
  const satisfied = useCheckStore((state) => state.satisfied);
  const saving = useCheckStore((state) => state.saving);
  const satisfy = useCheckStore((state) => state.satisfy);
  const reset = useCheckStore((state) => state.reset);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => setReady(canSatisfy());
    const id = setInterval(tick, 60_000);
    const t = setTimeout(tick, 0); // fires after hydration, never during SSR
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);

  const percent = items.length
    ? Math.round((items.filter((item) => item.done).length / items.length) * 100)
    : 0;

  const endDay = async () => {
    if (items.length === 0) return;
    try {
      await satisfy(percent);
      await reset();
      toast.success(`Day closed — ${percent}% · see you tomorrow`);
    } catch {
      toast.error("Could not close the day");
    }
  };

  // --- The day is closed: a quiet full stop -------------------------------
  if (satisfied !== null) {
    return (
      <section
        aria-label="Day closed"
        className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-border/70 bg-popover px-6 py-8 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
          <MoonStar aria-hidden="true" className="size-6" strokeWidth={1.5} />
        </span>
        <div>
          <p className="type-title text-foreground">Day closed</p>
          <p className="mt-0.5 text-xs tabular-nums text-foreground">{satisfied}%</p>
        </div>
      </section>
    );
  }

  // --- Evening: the big moment --------------------------------------------
  return (
    <section
      aria-label="Close the day"
      className="mt-6 rounded-2xl border-2 border-border/70 bg-popover p-3"
    >
      <Button
        aria-label={`Close the day, ${percent} percent done`}
        className="h-14 w-full gap-2 rounded-2xl text-sm font-extrabold"
        disabled={!ready || items.length === 0 || saving}
        onClick={() => void endDay()}
        title={ready ? undefined : "Available after 6pm"}
        type="button"
        variant="default"
      >
        {saving ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <ProgressRing className="size-5" percent={percent} />
        )}
        {saving ? "Closing…" : `Close the day · ${percent}%`}
      </Button>
    </section>
  );
}
