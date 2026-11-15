import "server-only";

import { ID, Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";

const tableId = "tasks";

export type TaskRow = Models.Row & {
  user: string;
  text: string;
  done: boolean;
};

export type BrainTask = { id: string; text: string; done: boolean };

/** Newest first. Open + recently done, capped small for snappy reads. */
export async function listBrainTasks(userId: string): Promise<BrainTask[]> {
  const result = await getTables().listRows<TaskRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.select(["$id", "text", "done", "$createdAt"]),
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ],
    total: false,
  });
  return result.rows.map((row) => ({ id: row.$id, text: row.text, done: row.done }));
}

export async function listOpenBrainTasks(userId: string): Promise<BrainTask[]> {
  const result = await getTables().listRows<TaskRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("done", false),
      Query.select(["$id", "text", "done"]),
      Query.limit(100),
    ],
    total: false,
  });
  return result.rows.map((row) => ({ id: row.$id, text: row.text, done: row.done }));
}

export async function countOpenBrainTasks(userId: string): Promise<number> {
  // Cheap enough: select only ids, limit small.
  const result = await getTables().listRows<TaskRow>({
    databaseId: getDatabaseId(),
    tableId,
    queries: [
      Query.equal("user", userId),
      Query.equal("done", false),
      Query.select(["$id"]),
      Query.limit(101),
    ],
    total: false,
  });
  return result.rows.length;
}

export async function createBrainTask(
  userId: string,
  text: string,
): Promise<BrainTask> {
  const tables = getTables();
  const row = await tables.createRow<TaskRow>({
    databaseId: getDatabaseId(),
    tableId,
    rowId: ID.unique(),
    permissions: [],
    data: { user: userId, text, done: false },
  });
  return { id: row.$id, text: row.text, done: row.done };
}

export async function setBrainTaskDone(
  userId: string,
  id: string,
  done: boolean,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TaskRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.updateRow<TaskRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
      data: { done },
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function setBrainTaskText(
  userId: string,
  id: string,
  text: string,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TaskRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.updateRow<TaskRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
      data: { text },
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function deleteBrainTask(
  userId: string,
  id: string,
): Promise<boolean> {
  const tables = getTables();
  try {
    const row = await tables.getRow<TaskRow>({
      databaseId: getDatabaseId(),
      tableId,
      rowId: id,
    });
    if (row.user !== userId) return false;
    await tables.deleteRow({ databaseId: getDatabaseId(), tableId, rowId: id });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}
