import { describe, expect, it } from "vitest";
import { polishEntrySchema } from "./schemas";

describe("polishEntrySchema", () => {
  it("accepts a real dictation", () => {
    const parsed = polishEntrySchema.safeParse({
      text: "so today i went to the gym early yeah it was cold but i did it",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects tiny or oversized payloads", () => {
    expect(polishEntrySchema.safeParse({ text: "" }).success).toBe(false);
    expect(polishEntrySchema.safeParse({ text: "too short" }).success).toBe(false);
    expect(
      polishEntrySchema.safeParse({ text: "x".repeat(1001) }).success,
    ).toBe(false);
  });

  it("rejects unexpected keys", () => {
    expect(
      polishEntrySchema.safeParse({ text: "more than ten chars here", extra: 1 }).success,
    ).toBe(false);
  });
});
