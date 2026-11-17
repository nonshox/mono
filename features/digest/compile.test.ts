import { describe, expect, it } from "vitest";
import {
  compileLetter,
  compileYear,
  nudgeQuestionFor,
  polishEntry,
} from "./compile";

const entries = (texts: string[]) =>
  texts.map((text, index) => ({
    day: `2026-11-${String(index + 1).padStart(2, "0")}`,
    text,
    satisfied: 50,
  }));

describe("compileLetter", () => {
  it("reports days, words and signs off with Your week", () => {
    const letter = compileLetter(
      entries(["Berlin trip booked", "Berlin coffee with Sam", "thinking Berlin again"]),
    );
    expect(letter).toContain("3 days");
    expect(letter).toContain("Themes: berlin");
    expect(letter.trimEnd().endsWith("Your week")).toBe(true);
  });

  it("handles an empty week without throwing", () => {
    expect(compileLetter([])).toContain("Your week");
  });
});

describe("compileYear", () => {
  it("reports total days and signs off with Your year", () => {
    const letter = compileYear(
      entries(["Berlin trip booked", "Deep work all day"]),
    );
    expect(letter).toContain("2 days");
    expect(letter.trimEnd().endsWith("Your year")).toBe(true);
  });

  it("handles an empty year without throwing", () => {
    expect(compileYear([])).toContain("Your year");
  });
});

describe("nudgeQuestionFor", () => {
  it("anchors to a recurring theme when one exists", () => {
    const recent = entries(["Berlin", "Berlin walk", "Berlin cafe", "Berlin museum"]);
    expect(nudgeQuestionFor(recent, 3)).toContain("berlin");
  });

  it("rotates the fallback bank deterministically", () => {
    expect(nudgeQuestionFor([], 0)).toBe(nudgeQuestionFor([], 0));
    expect(nudgeQuestionFor([], 1)).not.toBe(nudgeQuestionFor([], 0));
  });
});

describe("polishEntry", () => {
  it("strips fillers, fixes the lone i, capitalizes and closes the sentence", () => {
    expect(polishEntry("um i went to the gym today i feel good")).toBe(
      "I went to the gym today I feel good.",
    );
  });

  it("collapses spaces and stray punctuation without inventing content", () => {
    expect(polishEntry("hello  world")).toBe("Hello world.");
    expect(polishEntry("called him,,, no answer")).toBe("Called him, no answer.");
  });

  it("leaves an already-tidied sentence alone (fixture is idempotent)", () => {
    expect(polishEntry("Walked the dog.")).toBe("Walked the dog.");
  });
});
