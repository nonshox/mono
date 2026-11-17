import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockListRows = vi.fn();

vi.mock("@/lib/appwrite/tables", () => ({
  getTables: () => ({ listRows: mockListRows }),
  getDatabaseId: () => "db",
  isNotFound: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 404,
}));

import { listAllEntries } from "./service";

const makeRows = (count: number, start: number) =>
  Array.from({ length: count }, (_, i) => ({
    $id: `row-${start + i}`,
    user: "u1",
    day: `2026-01-${String(start + i + 1).padStart(2, "0")}`,
    text: `line ${start + i}`,
    satisfied: null,
  }));

describe("listAllEntries pagination", () => {
  beforeEach(() => {
    mockListRows.mockReset();
  });

  it("stitches pages together in ascending order with no truncation", async () => {
    // 2.5 pages of 1000 → 2500 rows total
    mockListRows
      .mockResolvedValueOnce({ rows: makeRows(1000, 0) })
      .mockResolvedValueOnce({ rows: makeRows(1000, 1000) })
      .mockResolvedValueOnce({ rows: makeRows(500, 2000) });

    const entries = await listAllEntries("u1");

    expect(mockListRows).toHaveBeenCalledTimes(3);
    expect(entries).toHaveLength(2500);
    expect(entries[0].day).toBe("2026-01-01");
    expect(entries[2499].day).toBe("2026-01-2500");
  });

  it("stops on a short page without a third call", async () => {
    mockListRows.mockResolvedValueOnce({ rows: makeRows(120, 0) });

    const entries = await listAllEntries("u1");

    expect(mockListRows).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(120);
  });

  it("passes equal/limit/offset/select queries exactly once per page", async () => {
    mockListRows.mockResolvedValueOnce({ rows: makeRows(1000, 0) });
    mockListRows.mockResolvedValueOnce({ rows: makeRows(3, 1000) });

    await listAllEntries("u1");

    const first = mockListRows.mock.calls[0][0] as {
      queries: unknown[];
      tableId: string;
    };
    const second = mockListRows.mock.calls[1][0] as {
      queries: unknown[];
      tableId: string;
    };
    expect(first.tableId).toBe("days");
    expect(second.tableId).toBe("days");
    const firstQueryStrings = first.queries.map(String);
    const secondQueryStrings = second.queries.map(String);
    expect(firstQueryStrings.join(" ")).toContain('"method":"equal"');
    expect(firstQueryStrings.join(" ")).toContain('"method":"limit"');
    expect(firstQueryStrings.join(" ")).toContain('"values":[0]');
    expect(secondQueryStrings.join(" ")).toContain('"values":[1000]');
  });
});
