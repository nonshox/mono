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

vi.mock("@/lib/appwrite/tables", () => ({
  getTables: () => mockTables,
  getDatabaseId: () => "db",
  isNotFound: (error: unknown) =>
    error instanceof AppwriteException && error.code === 404,
}));

import {
  dayRowId,
  upsertDayEntry,
  setDaySatisfied,
  clearDaySatisfied,
} from "./service";

const userId = "user-123";
const day = "2026-11-17";

describe("dayRowId", () => {
  it("is deterministic per user and day", () => {
    expect(dayRowId(userId, day)).toBe(dayRowId(userId, day));
  });

  it("differs across users and days", () => {
    expect(dayRowId(userId, day)).not.toBe(dayRowId("other", day));
    expect(dayRowId(userId, day)).not.toBe(dayRowId(userId, "2026-11-16"));
  });
});

describe("upsertDayEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the existing row when one exists", async () => {
    mockTables.updateRow.mockResolvedValueOnce({});

    await upsertDayEntry(userId, day, "hello");

    expect(mockTables.updateRow).toHaveBeenCalledTimes(1);
    expect(mockTables.createRow).not.toHaveBeenCalled();
    expect(mockTables.updateRow.mock.calls[0][0].data).toEqual({ text: "hello" });
  });

  it("creates the row when the update hits a missing row", async () => {
    mockTables.updateRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    mockTables.createRow.mockResolvedValueOnce({});

    await upsertDayEntry(userId, day, "hello");

    expect(mockTables.createRow).toHaveBeenCalledTimes(1);
    const created = mockTables.createRow.mock.calls[0][0];
    expect(created.rowId).toBe(dayRowId(userId, day));
    expect(created.data).toMatchObject({ user: userId, day, text: "hello" });
  });

  it("falls back to update when create reports 409 (concurrent writer)", async () => {
    mockTables.updateRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    mockTables.createRow.mockRejectedValueOnce(
      new AppwriteException("conflict", 409, "x"),
    );
    mockTables.updateRow.mockResolvedValueOnce({});

    await upsertDayEntry(userId, day, "hello");

    expect(mockTables.updateRow).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to update when create fails with a non-409 error", async () => {
    mockTables.updateRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    mockTables.createRow.mockRejectedValueOnce(
      new AppwriteException("quota exceeded", 429, "x"),
    );

    await expect(upsertDayEntry(userId, day, "hello")).rejects.toThrow(
      AppwriteException,
    );
    expect(mockTables.updateRow).toHaveBeenCalledTimes(1);
  });
});

describe("setDaySatisfied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing row instead of creating a duplicate", async () => {
    mockTables.updateRow.mockResolvedValueOnce({});

    await setDaySatisfied(userId, day, 72);

    expect(mockTables.updateRow).toHaveBeenCalledTimes(1);
    expect(mockTables.createRow).not.toHaveBeenCalled();
  });

  it("creates the row with an empty text when none exists", async () => {
    mockTables.updateRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    mockTables.createRow.mockResolvedValueOnce({});

    await setDaySatisfied(userId, day, 72);

    const created = mockTables.createRow.mock.calls[0][0];
    expect(created.rowId).toBe(dayRowId(userId, day));
    expect(created.data).toMatchObject({ user: userId, day, text: "", satisfied: 72 });
  });
});

describe("clearDaySatisfied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op when the row does not exist", async () => {
    mockTables.updateRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );

    await clearDaySatisfied(userId, day);
    expect(mockTables.updateRow).toHaveBeenCalledTimes(1);
  });
});
