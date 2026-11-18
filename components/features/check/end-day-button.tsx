"use client";

import { LoaderCircle } from "lucide-react";
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
 * Single evening button — merged "satisfy" + "reset": logs today's completion
 * and clears the board for tomorrow. Disabled before 6pm (evening practice)
 * and once the day is closed.
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
      toast.success(`Check: ${percent}% — cleared for tomorrow`);
    } catch {
      toast.error("Could not close the day");
    }
  };

  return (
    <div className="mt-6 flex items-center justify-end">
      <Button
        aria-label={
          satisfied !== null
            ? `Best day, ${satisfied} percent`
            : `End of day, ${percent} percent done`
        }
        className="gap-1.5 rounded-full px-4 text-xs font-extrabold text-background hover:opacity-80 disabled:opacity-30"
        disabled={!ready || items.length === 0 || saving || satisfied !== null}
        onClick={() => void endDay()}
        title={ready ? undefined : "Available after 6pm"}
        type="button"
        variant="default"
      >
        {saving ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <ProgressRing percent={satisfied ?? percent} />
        )}
        {satisfied !== null ? "Best" : "Done"}
      </Button>
    </div>
  );
}
