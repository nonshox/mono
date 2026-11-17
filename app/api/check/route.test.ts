import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockGetAuthAccount = vi.fn();
const mockIsSameOrigin = vi.fn();
const mockJsonError = vi.fn(
  (status: number, code: string, message: string) =>
    NextResponse.json({ error: { code, message } }, { status }),
);
const mockLoadCheckBundle = vi.fn();
const mockCreateTimelineItem = vi.fn();
const mockSetTimelineItemDone = vi.fn();

vi.mock("@/lib/http", () => ({
  NO_STORE_HEADERS: { "Cache-Control": "private, no-store" },
  getAuthAccount: (...args: unknown[]) => mockGetAuthAccount(...args),
  isSameOrigin: (...args: unknown[]) => mockIsSameOrigin(...args),
  jsonError: (...args: unknown[]) => mockJsonError(...args as [number, string, string]),
  logFailure: () => undefined,
}));

vi.mock("@/features/check/service", () => ({
  createTimelineItem: (...args: unknown[]) =>
    mockCreateTimelineItem(...args),
  moveTimelineItem: vi.fn().mockResolvedValue(true),
  setTimelineItemDone: (...args: unknown[]) =>
    mockSetTimelineItemDone(...args),
  updateTimelineItemText: vi.fn().mockResolvedValue(true),
  deleteTimelineItem: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/check/satisfy", () => ({
  loadCheckBundle: (...args: unknown[]) => mockLoadCheckBundle(...args),
}));

import { GET, POST, PATCH } from "./route";

const authUser = { account: { $id: "user-abc" } };

const authed = (withUser = true) => {
  if (withUser) {
    mockGetAuthAccount.mockResolvedValue(authUser);
  } else {
    mockGetAuthAccount.mockResolvedValue({
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in." } },
        { status: 401 },
      ),
    });
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSameOrigin.mockReturnValue(true);
  authed(true);
});

describe("GET /api/check", () => {
  it("returns the bundle for an authenticated user", async () => {
    mockLoadCheckBundle.mockResolvedValue({
      items: [{ id: "i1", bucket: "rise", text: "x", order: 0, done: false }],
      satisfied: null,
      day: "2026-11-17",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 401-ish response when unauthenticated", async () => {
    authed(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 502 when the bundle throws", async () => {
    mockLoadCheckBundle.mockRejectedValueOnce(new Error("appwrite down"));
    const res = await GET();
    expect(res.status).toBe(502);
  });
});

describe("POST /api/check", () => {
  const req = (body: unknown, origin = "https://mono.test") =>
    new Request("https://mono.test/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin },
      body: JSON.stringify(body),
    });

  it("rejects cross-origin requests", async () => {
    mockIsSameOrigin.mockReturnValue(false);
    const res = await POST(req({ bucket: "rise", text: "x" }, "https://evil.test"));
    expect(res.status).toBe(403);
  });

  it("rejects invalid bucket/text input", async () => {
    const res = await POST(req({ bucket: "midnight", text: "x" }));
    expect(res.status).toBe(400);
  });

  it("creates an item with a valid body", async () => {
    mockCreateTimelineItem.mockResolvedValueOnce({
      id: "i2",
      bucket: "rise",
      text: "write",
      order: 1,
      done: false,
    });

    const res = await POST(req({ bucket: "rise", text: "write" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.item.id).toBe("i2");
  });
});

describe("PATCH /api/check", () => {
  const req = (body: unknown) =>
    new Request("https://mono.test/api/check", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", origin: "https://mono.test" },
      body: JSON.stringify(body),
    });

  it("toggles an item the user owns", async () => {
    mockSetTimelineItemDone.mockResolvedValueOnce(true);

    const res = await PATCH(req({ kind: "toggle", id: "i1", done: true }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when toggling a missing item", async () => {
    mockSetTimelineItemDone.mockResolvedValueOnce(false);

    const res = await PATCH(req({ kind: "toggle", id: "gone", done: true }));
    expect(res.status).toBe(404);
  });
});
