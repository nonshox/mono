import { describe, expect, it } from "vitest";
import {
  countWords,
  groupJournalEntries,
  highlightParts,
  matchesQuery,
} from "./group";

const entry = (day: string, text: string) => ({ day, text });

describe("groupJournalEntries", () => {
  it("buckets ascending entries into years and months", () => {
    const groups = groupJournalEntries([
      entry("2025-11-15", "a"),
      entry("2025-12-01", "b"),
      entry("2026-01-03", "c"),
      entry("2026-01-04", "d"),
    ]);

    expect(groups.map((g) => g.year)).toEqual([2025, 2026]);
    expect(groups[0].months.map((m) => m.month)).toEqual([11, 12]);
    expect(groups[1].months).toHaveLength(1);
    expect(groups[1].months[0].entries.map((e) => e.text)).toEqual(["c", "d"]);
  });

  it("returns an empty list for no entries", () => {
    expect(groupJournalEntries([])).toEqual([]);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words across entries", () => {
    expect(countWords([entry("2026-01-01", "one two  three\nfour"), entry("2026-01-02", "five")])).toBe(5);
    expect(countWords([])).toBe(0);
    expect(countWords([entry("2026-01-01", "   ")])).toBe(0);
  });
});

describe("highlightParts", () => {
  it("splits case-insensitive matches and keeps the original casing", () => {
    expect(highlightParts("Berlin is nice, berlin at night", "berlin")).toEqual([
      { text: "Berlin", match: true },
      { text: " is nice, ", match: false },
      { text: "berlin", match: true },
      { text: " at night", match: false },
    ]);
  });

  it("returns a single unmatched part for empty queries", () => {
    expect(highlightParts("hello", "")).toEqual([{ text: "hello", match: false }]);
    expect(highlightParts("hello", "   ")).toEqual([{ text: "hello", match: false }]);
  });

  it("handles matches at the boundaries", () => {
    expect(highlightParts("abc x abc", "abc")).toEqual([
      { text: "abc", match: true },
      { text: " x ", match: false },
      { text: "abc", match: true },
    ]);
  });
});

describe("matchesQuery", () => {
  it("matches text and dates, case-insensitively", () => {
    expect(matchesQuery(entry("2026-03-05", "Deep Fried egg"), "deep fried")).toBe(true);
    expect(matchesQuery(entry("2026-03-05", "x"), "2026-03")).toBe(true);
    expect(matchesQuery(entry("2026-03-05", "x"), "pizza")).toBe(false);
    expect(matchesQuery(entry("2026-03-05", "anything"), "")).toBe(true);
  });
});
