import "server-only";
import { AppwriteException, TablesDB, type Models } from "node-appwrite";
import {
  createAdminClient,
  getAppwriteDatabaseId,
} from "@/lib/appwrite/server";
import { logFailure } from "@/lib/http";

// Reused across calls — `Client` holds only config, so one instance per process is fine.
let tables: TablesDB | null = null;
export const getTables = () => {
  if (!tables) {
    tables = new TablesDB(createAdminClient());
  }
  return tables;
};
export const getDatabaseId = () => getAppwriteDatabaseId();

/**
 * Runs row operations inside a single Appwrite transaction. Any failure
 * rolls the transaction back; the error is re-thrown for the caller.
 */
export async function runTransaction(
  operation: (transactionId: string) => Promise<void>,
  label = "Transaction",
): Promise<void> {
  const service = getTables();
  let transactionId: string | null = null;
  let stage = "create";

  try {
    const transaction = await service.createTransaction({ ttl: 60 });
    transactionId = transaction.$id;
    stage = "stage operations";
    await operation(transactionId);
    stage = "commit";
    const result = await service.updateTransaction({
      transactionId,
      commit: true,
    });
    if (result.status !== "committed") {
      throw new Error(`Transaction ended as ${result.status}.`);
    }
  } catch (error) {
    if (transactionId) {
      try {
        await service.updateTransaction({
          transactionId,
          rollback: true,
        });
      } catch (rollbackError) {
        logFailure(`${label} rollback`, rollbackError);
      }
    }
    logFailure(`${label} ${stage}`, error);
    throw error;
  }
}

export type Row = Models.Row;

export function isNotFound(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 404;
}
