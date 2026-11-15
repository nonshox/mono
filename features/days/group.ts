/** Pure grouping + highlighting helpers for the reading page (`/journal`). */
import type { DayEntry } from "./client-api";

export type JournalMonth = { month: number; entries: DayEntry[] };
export type JournalYear = { year: number; months: JournalMonth[] };

/** Bucket an ascending day-sorted list into year → month groups, preserving order. */
export function groupJournalEntries(entries: DayEntry[]): JournalYear[] {
  const years: JournalYear[] = [];

  for (const entry of entries) {
    const [y, m] = [
      Number(entry.day.slice(0, 4)),
      Number(entry.day.slice(5, 7)),
    ];
    let yearGroup = years.at(-1);
    if (!yearGroup || yearGroup.year !== y) {
      yearGroup = { year: y, months: [] };
      years.push(yearGroup);
    }
    let monthGroup = yearGroup.months.at(-1);
    if (!monthGroup || monthGroup.month !== m) {
      monthGroup = { month: m, entries: [] };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.entries.push(entry);
  }

  return years;
}

/** Total word count across every entry (whitespace-split). */
export function countWords(entries: DayEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    const words = entry.text.trim().split(/\s+/).filter(Boolean);
    total += words.length;
  }
  return total;
}

/**
 * Splits `text` into alternating parts flagged as match/no-match for
 * case-insensitive literal `query`. Empty query → one part, no matches.
 */
export function highlightParts(
  text: string,
  query: string,
): Array<{ text: string; match: boolean }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const parts: Array<{ text: string; match: boolean }> = [];
  const haystack = text.toLowerCase();
  let index = 0;

  for (;;) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      if (index < text.length) parts.push({ text: text.slice(index), match: false });
      return parts;
    }
    if (found > index) parts.push({ text: text.slice(index, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    index = found + needle.length;
  }
}

/** Does the entry match a literal, case-insensitive query? */
export function matchesQuery(entry: DayEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    entry.text.toLowerCase().includes(needle) ||
    entry.day.includes(needle)
  );
}
