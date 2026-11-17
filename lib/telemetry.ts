import "server-only";

/**
 * Minimal server-side request timing you can reuse in any route.
 *
 * - `lap(label)` records a phase duration in milliseconds.
 * - `header()` renders a standards-compliant Server-Timing header value
 *   (visible in DevTools → Network → Headers).
 * - `report(route)` logs one structured JSON line via console.error when
 *   the total exceeds the slow threshold (default 700ms). We use
 *   console.error because the prod build strips console.log; Vercel
 *   captures error output in Functions → Logs.
 */

type Timing = {
  lap: (label: string) => number;
  header: () => string;
  total: () => number;
  phases: () => Record<string, number>;
};

const SLOW_MS = 700;

export function startTiming(started: number = performance.now()): Timing {
  const phases: Record<string, number> = {};
  let markStart = started;

  const lap = (label: string): number => {
    const now = performance.now();
    phases[label] = Math.round(now - markStart);
    markStart = now;
    return phases[label];
  };

  const total = (): number => Math.round(performance.now() - started);

  return {
    lap,
    total,
    header: () => {
      const entries = Object.entries(phases).map(
        ([label, dur]) => `${label};dur=${dur}`,
      );
      entries.push(`total;dur=${total()}`);
      return entries.join(", ");
    },
    phases: () => ({ ...phases, total: total() }),
  };
}

export function report(route: string, timing: Timing, extra?: Record<string, unknown>): void {
  const current = timing.phases();
  if (current.total < SLOW_MS) return;
  console.error(
    JSON.stringify({
      kind: "slow-request",
      route,
      ...current,
      ...extra,
    }),
  );
}
