import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { suggestBucket } from "./suggest";
import type { DayEntry } from "@/features/days/service";

const entries: DayEntry[] = [
  { day: "2026-11-10", text: "read physics for an hour, felt good", satisfied: null },
  { day: "2026-11-11", text: "studying physics again this morning", satisfied: null },
];

const geminiOk = (items: string[]) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(items) }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

describe("suggestBucket", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("serves an identical tap from cache without a second network call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(geminiOk(["Physics with coffee", "One problem before lunch"]));
    vi.stubGlobal("fetch", fetchMock);

    const first = await suggestBucket("midday", entries, ["read", "physics"], []);
    expect(first.source).toBe("ai");
    expect(first.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await suggestBucket("midday", entries, ["read", "physics"], []);
    expect(second.source).toBe("ai");
    expect(second.cached).toBe(true);
    expect(second.items).toEqual(first.items);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to local picks when Gemini answers with garbage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json at all" }] } }] }), { status: 200 }),
      ),
    );

    const result = await suggestBucket("rise", entries, ["read"], []);
    expect(result.source).toBe("local");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("falls back to local picks on a 503 wave instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 503, message: "overloaded" } }), { status: 503 }),
      ),
    );

    const result = await suggestBucket("evening", entries, ["mono"], []);
    expect(result.source).toBe("local");
    expect(result.items.length).toBeGreaterThan(0);
  });
});
