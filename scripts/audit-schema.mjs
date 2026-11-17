// Read-only schema audit — lists tables, columns and indexes. No writes.
// Usage: node --env-file=.env scripts/audit-schema.mjs
import { Client, TablesDB } from "node-appwrite";

for (const name of [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const tables = await db.listTables({ databaseId, total: false });
for (const table of tables.tables) {
  console.log(`\n== ${table.$id} ==`);
  try {
    const columns = await db.listColumns({ databaseId, tableId: table.$id });
    for (const column of columns.columns) {
      console.log(
        `  col ${column.key}: ${column.type}${column.size ? `(${column.size})` : ""}` +
          `${column.required ? " required" : " optional"}` +
          `${column.xdefault !== undefined && column.xdefault !== null ? ` default=${JSON.stringify(column.xdefault)}` : ""}` +
          `${column.array ? " []" : ""}`,
      );
    }
  } catch (error) {
    console.log(`  columns: ERROR ${error?.message ?? error}`);
  }
  try {
    const indexes = await db.listIndexes({ databaseId, tableId: table.$id });
    for (const index of indexes.indexes) {
      console.log(`  idx ${JSON.stringify(index)}`);
    }
  } catch (error) {
    console.log(`  indexes: ERROR ${error?.message ?? error}`);
  }
}
