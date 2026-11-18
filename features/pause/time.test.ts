import { describe, expect, it } from "vitest";
import { formatClock } from "./time";

describe("formatClock", () => {
  it("clamps negatives to zero", () => {
    expect(formatClock(-5000)).toBe("0:00");
  });

  it("rounds partial seconds up", () => {
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(59_100)).toBe("1:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(25 * 60_000)).toBe("25:00");
  });

  it("formats hours past sixty minutes", () => {
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});
