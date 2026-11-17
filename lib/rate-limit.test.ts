import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit, then blocks with a retry hint", () => {
    const results = [1, 2, 3].map(() => rateLimit("test:basic", "user1", 3, 60_000));
    expect(results.every((r) => r.ok)).toBe(true);

    const blocked = rateLimit("test:basic", "user1", 3, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("resets after the window passes", () => {
    rateLimit("test:reset", "user1", 1, 30_000);
    expect(rateLimit("test:reset", "user1", 1, 30_000).ok).toBe(false);

    vi.setSystemTime(new Date("2026-11-17T12:00:31Z"));
    expect(rateLimit("test:reset", "user1", 1, 30_000).ok).toBe(true);
  });

  it("tracks keys and buckets independently", () => {
    rateLimit("test:a", "user1", 1, 60_000);
    expect(rateLimit("test:a", "user2", 1, 60_000).ok).toBe(true);
    expect(rateLimit("test:b", "user1", 1, 60_000).ok).toBe(true);
    expect(rateLimit("test:a", "user1", 1, 60_000).ok).toBe(false);
  });
});

describe("clientIp", () => {
  const requestWith = (headers: Record<string, string>) =>
    new Request("https://mono.test/api/x", { headers });

  it("reads the first x-forwarded-for entry", () => {
    const req = requestWith({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(clientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(requestWith({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(requestWith({}))).toBe("unknown");
  });
});
