import { describe, expect, it } from "vitest";
import { extractThemes } from "./themes";

const entries = (texts: string[]) =>
  texts.map((text, index) => ({
    day: `2026-11-${String(index + 1).padStart(2, "0")}`,
    text,
  }));

describe("extractThemes", () => {
  it("finds the dominant unigram and ignores stopwords", () => {
    const themes = extractThemes(
      entries([
        "Berlin trip booked",
        "Berlin coffee with Sam",
        "Thinking about Berlin again",
        "Berlin calling",
      ]),
    );
    expect(themes[0]?.label).toBe("berlin");
  });

  it("prefers a dominant bigram over its unigrams", () => {
    const themes = extractThemes(
      entries([
        "deep fried again",
        "deep fried eggs",
        "more deep fried",
        "deep fried morning",
      ]),
    );
    expect(themes.some((theme) => theme.label === "deep fried")).toBe(true);
    expect(themes.some((theme) => theme.label === "fried")).toBe(false);
  });

  it("requires at least 3 occurrences", () => {
    const themes = extractThemes(entries(["sleep", "sleep"]));
    expect(themes).toEqual([]);
  });

  it("returns an empty list for no entries", () => {
    expect(extractThemes([])).toEqual([]);
  });
});
