/**
 * Level — Mono's quiet progression. One level per 100 verified push-ups.
 * No XP inflation, no fake precision; just the grind, quantified.
 */
export function computeLevel(totalReps: number): number {
  return Math.floor(Math.max(0, totalReps) / 100) + 1;
}
