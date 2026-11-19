import { describe, expect, it } from "vitest";
import { compileLetter, nudgeQuestionFor } from "./compile";

describe("nudgeQuestionFor", () => {
  it("uses the fallback bank with no entries and appends the breathing cue", () => {
    const nudge = nudgeQuestionFor([], 0);
    expect(nudge).toContain("The day's almost gone");
    expect(nudge).toContain("5 in · 5 out");
  });

  it("grounds the nudge in recent themes when entries exist", () => {
    const entries = [
      { day: "2026-11-16", text: "the lathe project ate my afternoon again", satisfied: null },
      { day: "2026-11-17", text: "finally got the lathe to cut clean faces", satisfied: null },
      { day: "2026-11-18", text: "lathe again. this time it behaved", satisfied: null },
    ];
    const nudge = nudgeQuestionFor(entries, 0);
    expect(nudge.toLowerCase()).toContain("lathe");
    expect(nudge).toContain("5 in · 5 out");
  });

  it("is deterministic for the same seed", () => {
    expect(nudgeQuestionFor([], 3)).toBe(nudgeQuestionFor([], 3));
    expect(nudgeQuestionFor([], 4)).not.toBe(nudgeQuestionFor([], 3));
  });
});

describe("compileLetter", () => {
  it("returns the empty-week compassion with no entries", () => {
    const letter = compileLetter([]);
    expect(letter).toContain("Your week");
    expect(letter.toLowerCase()).toContain("dot will wait");
  });

  it("summarises the week when entries exist, without HTML for plain output", () => {
    const entries = [
      { day: "2026-11-16", text: "a long quiet line about the weather and the work", satisfied: 80 },
      { day: "2026-11-18", text: "another line, shorter", satisfied: null },
    ];
    const letter = compileLetter(entries, true);
    expect(letter).toContain("Your week");
    expect(letter).toContain("2 days");
    expect(letter).not.toContain("<b>");
    expect(letter).not.toContain("</i>");
  });
});
