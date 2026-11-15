import { deleteDaySchema, upsertDaySchema } from "./schemas";
import { describe, expect, it } from "vitest";

describe("dayKeySchema", () => {
  it("accepts real calendar dates", () => {
    expect(upsertDaySchema.safeParse({ day: "2026-11-15", text: "today" }).success).toBe(true);
    expect(upsertDaySchema.safeParse({ day: "2024-02-29", text: "leap" }).success).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(upsertDaySchema.safeParse({ day: "2026-02-30", text: "nope" }).success).toBe(false);
    expect(upsertDaySchema.safeParse({ day: "2025-02-29", text: "nope" }).success).toBe(false);
    expect(upsertDaySchema.safeParse({ day: "2026-13-01", text: "nope" }).success).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(upsertDaySchema.safeParse({ day: "11/15/2026", text: "x" }).success).toBe(false);
    expect(upsertDaySchema.safeParse({ day: "2026-11-5", text: "x" }).success).toBe(false);
  });
});

describe("upsertDaySchema", () => {
  it("trims text and rejects empty entries", () => {
    expect(upsertDaySchema.safeParse({ day: "2026-11-15", text: "   " }).success).toBe(false);
    const parsed = upsertDaySchema.safeParse({ day: "2026-11-15", text: "  good day  " });
    expect(parsed.success && parsed.data.text).toBe("good day");
  });

  it("enforces the 1000 character cap", () => {
    expect(
      upsertDaySchema.safeParse({ day: "2026-11-15", text: "x".repeat(1000) }).success,
    ).toBe(true);
    expect(
      upsertDaySchema.safeParse({ day: "2026-11-15", text: "x".repeat(1001) }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      upsertDaySchema.safeParse({ day: "2026-11-15", text: "x", mood: 5 }).success,
    ).toBe(false);
  });
});

describe("deleteDaySchema", () => {
  it("accepts a valid day and rejects junk", () => {
    expect(deleteDaySchema.safeParse({ day: "2026-11-15" }).success).toBe(true);
    expect(deleteDaySchema.safeParse({ day: "../etc" }).success).toBe(false);
  });
});
