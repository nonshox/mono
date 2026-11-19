/**
 * UTC today as YYYY-MM-DD — for cases with no user context (export stamp, tests).
 * Prefer userDay() in anything the user experiences.
 */
export const todayUtc = (): string =>
  new Date().toISOString().slice(0, 10);

/**
 * The IANA timezone to use for a user, validated. Falls back to "UTC" when
 * missing or unrecognized so every caller can rely on a working value.
 */
export function userTimeZone(timeZone?: string | null): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * The user's local day as YYYY-MM-DD, computed in their stored timezone.
 * Falls back to UTC when the timezone is missing or invalid — honest behavior:
 * the day is always a valid ISO date string, and ranges still work because
 * ISO strings compare lexicographically.
 *
 * `now` is injectable for testing.
 */
export function userDay(timeZone: string | null | undefined, now: Date = new Date()): string {
  const tz = userTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    return now.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}
