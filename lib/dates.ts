/**
 * UTC today as YYYY-MM-DD — for cases with no user context (export stamp, tests).
 * Prefer userDay() in anything the user experiences.
 */
export const todayUtc = (): string =>
  new Date().toISOString().slice(0, 10);

/**
 * The user's local day as YYYY-MM-DD, computed in their stored timezone.
 * Falls back to UTC when the timezone is missing or invalid — honest behavior:
 * the day is always a valid ISO date string, and ranges still work because
 * ISO strings compare lexicographically.
 *
 * `now` is injectable for testing.
 */
export function userDay(timeZone: string | null | undefined, now: Date = new Date()): string {
  if (!timeZone) {
    return now.toISOString().slice(0, 10);
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!year || !month || !day) {
      return now.toISOString().slice(0, 10);
    }
    return `${year}-${month}-${day}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
