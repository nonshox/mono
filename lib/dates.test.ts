import { describe, expect, it } from "vitest";
import { todayUtc, userDay } from "./dates";

describe("todayUtc", () => {
  it("returns an ISO YYYY-MM-DD", () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("userDay", () => {
  // 2026-11-17T00:30:00.000Z — UTC day is the 17th, but it is the 16th in
  // Tashkent (UTC+5)... no wait, 00:30 UTC is 05:30 in Tashkent, so same day.
  // Use a late-evening instant instead:
  const now = new Date("2026-11-17T23:30:00.000Z");

  it("returns UTC day for UTC timezone", () => {
    expect(userDay("UTC", now)).toBe("2026-11-17");
  });

  it("returns the local day for Asia/Tashkent (UTC+5)", () => {
    // 23:30 UTC = 04:30 next day in Tashkent
    expect(userDay("Asia/Tashkent", now)).toBe("2026-11-18");
  });

  it("returns the local day for America/Toronto (UTC-5)", () => {
    // 23:30 UTC = 18:30 same day in Toronto
    expect(userDay("America/Toronto", now)).toBe("2026-11-17");
  });

  it("falls back to UTC when the timezone is missing", () => {
    expect(userDay(null, now)).toBe("2026-11-17");
    expect(userDay(undefined, now)).toBe("2026-11-17");
  });

  it("falls back to UTC for an invalid timezone string", () => {
    expect(userDay("Not/AZone", now)).toBe("2026-11-17");
  });
});
