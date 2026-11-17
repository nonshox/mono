import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppwriteException } from "node-appwrite";

vi.mock("server-only", () => ({}));

const mockTables = {
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  listRows: vi.fn(),
};

const mockTransaction = vi.fn();

vi.mock("@/lib/appwrite/tables", () => ({
  getTables: () => mockTables,
  getDatabaseId: () => "db",
  isNotFound: (error: unknown) =>
    error instanceof AppwriteException && error.code === 404,
  runTransaction: (op: (id: string) => Promise<void>) => mockTransaction(op("txn-1")),
}));

import {
  createTimelineItem,
  setTimelineItemDone,
  updateTimelineItemText,
  deleteTimelineItem,
  moveTimelineItem,
} from "./service";

const userId = "user-abc";
const row = (overrides: Record<string, unknown> = {}) => ({
  $id: "row-1",
  user: userId,
  bucket: "rise",
  text: "item",
  order: 0,
  done: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no transaction mock invocation unless a test sets it.
  mockTransaction.mockImplementation(async (p: Promise<void>) => p);
});

describe("createTimelineItem", () => {
  it("orders after the last item in the bucket", async () => {
    mockTables.listRows.mockResolvedValueOnce({
      rows: [{ order: 4 }],
    });
    mockTables.createRow.mockResolvedValueOnce({
      $id: "new",
      user: userId,
      bucket: "rise",
      text: "new item",
      order: 5,
      done: false,
    });

    const item = await createTimelineItem(userId, "rise", "new item");

    expect(mockTables.createRow.mock.calls[0][0].data.order).toBe(5);
    expect(item.order).toBe(5);
  });

  it("starts at order 0 when the bucket is empty", async () => {
    mockTables.listRows.mockResolvedValueOnce({ rows: [] });
    mockTables.createRow.mockResolvedValueOnce({
      $id: "new",
      user: userId,
      bucket: "midday",
      text: "x",
      order: 0,
      done: false,
    });

    const item = await createTimelineItem(userId, "midday", "x");
    expect(item.order).toBe(0);
  });
});

describe("setTimelineItemDone", () => {
  it("returns false when the row does not exist", async () => {
    mockTables.getRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    expect(await setTimelineItemDone(userId, "nope", true)).toBe(false);
  });

  it("refuses to touch another user's row", async () => {
    mockTables.getRow.mockResolvedValueOnce(
      row({ user: "someone-else" }),
    );
    expect(await setTimelineItemDone(userId, "row-1", true)).toBe(false);
    expect(mockTables.updateRow).not.toHaveBeenCalled();
  });

  it("toggles a row the user owns", async () => {
    mockTables.getRow.mockResolvedValueOnce(row({}));
    mockTables.updateRow.mockResolvedValueOnce({});
    expect(await setTimelineItemDone(userId, "row-1", true)).toBe(true);
    expect(mockTables.updateRow).toHaveBeenCalledWith(
      expect.objectContaining({ data: { done: true } }),
    );
  });
});

describe("updateTimelineItemText", () => {
  it("refuses to edit another user's row", async () => {
    mockTables.getRow.mockResolvedValueOnce(row({ user: "someone-else" }));
    expect(await updateTimelineItemText(userId, "row-1", "hijack")).toBe(false);
    expect(mockTables.updateRow).not.toHaveBeenCalled();
  });
});

describe("deleteTimelineItem", () => {
  it("refuses to delete another user's row", async () => {
    mockTables.getRow.mockResolvedValueOnce(row({ user: "someone-else" }));
    expect(await deleteTimelineItem(userId, "row-1")).toBe(false);
    expect(mockTables.deleteRow).not.toHaveBeenCalled();
  });
});

describe("moveTimelineItem", () => {
  it("returns false when the target row does not exist", async () => {
    mockTables.getRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    expect(await moveTimelineItem(userId, "nope", "up")).toBe(false);
  });

  it("refuses to move another user's row", async () => {
    mockTables.getRow.mockResolvedValueOnce(row({ user: "someone-else" }));
    expect(await moveTimelineItem(userId, "row-1", "up")).toBe(false);
  });

  it("swaps order with the next row inside a transaction", async () => {
    mockTables.getRow.mockResolvedValueOnce(row({ $id: "target", order: 2 }));
    mockTables.listRows.mockResolvedValueOnce({
      rows: [
        { $id: "a", order: 0 },
        { $id: "b", order: 1 },
        { $id: "target", order: 2 },
        { $id: "c", order: 3 },
      ],
    });

    const result = await moveTimelineItem(userId, "target", "down");

    expect(result).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTables.updateRow).toHaveBeenCalledTimes(2);
  });
});
