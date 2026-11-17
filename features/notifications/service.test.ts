import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppwriteException } from "node-appwrite";

vi.mock("server-only", () => ({}));

const mockTables = {
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  listRows: vi.fn(),
  deleteRow: vi.fn(),
};

vi.mock("@/lib/appwrite/tables", () => ({
  getTables: () => mockTables,
  getDatabaseId: () => "db",
  isNotFound: (error: unknown) =>
    error instanceof AppwriteException && error.code === 404,
}));

import {
  markNotificationRead,
  markAllNotificationsRead,
} from "./service";

const userId = "user-abc";

describe("markNotificationRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a row read when the user owns it", async () => {
    mockTables.getRow.mockResolvedValueOnce({ user: userId });
    mockTables.updateRow.mockResolvedValueOnce({});

    await markNotificationRead(userId, "notif-1");

    expect(mockTables.updateRow).toHaveBeenCalledWith(
      expect.objectContaining({ data: { read: true } }),
    );
  });

  it("does not mark another user's notification", async () => {
    mockTables.getRow.mockResolvedValueOnce({ user: "someone-else" });

    await markNotificationRead(userId, "notif-1");

    expect(mockTables.updateRow).not.toHaveBeenCalled();
  });

  it("silently ignores a missing notification", async () => {
    mockTables.getRow.mockRejectedValueOnce(
      new AppwriteException("not found", 404, "x"),
    );
    await markNotificationRead(userId, "gone");
    expect(mockTables.updateRow).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only the caller's unread rows", async () => {
    mockTables.listRows.mockResolvedValueOnce({ rows: [], total: 0 });

    await markAllNotificationsRead(userId);

    const joined = (mockTables.listRows.mock.calls[0][0].queries as string[]).join(" ");
    expect(joined).toContain('"attribute":"user"');
    expect(joined).toContain('"attribute":"read"');
    expect(joined).toContain('"values":[false]');
  });

  it("flips every unread row it fetches", async () => {
    mockTables.listRows.mockResolvedValueOnce({
      rows: [{ $id: "a" }, { $id: "b" }],
      total: 2,
    });
    mockTables.updateRow.mockResolvedValue({});

    await markAllNotificationsRead(userId);

    expect(mockTables.updateRow).toHaveBeenCalledTimes(2);
  });
});
