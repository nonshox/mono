// Read-only schema audit — probes every table we know about.
// Usage: node --env-file=.env scripts/audit-schema.mjs
import { Client, Query, TablesDB } from "node-appwrite";

const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const databaseId = process.env.APPWRITE_DATABASE_ID;

for (const tableId of ["users", "days", "timeline", "notifications", "telegram", "codes"]) {
  try {
    const cols = await db.listColumns({ databaseId, tableId });
    console.log(`\n[${tableId}] columns:`);
    for (const col of cols.columns) {
      console.log(`  ${col.key} : ${col.type}${col.required ? " required" : ""}`);
    }
    const idxs = await db.listIndexes({ databaseId, tableId });
    console.log("  indexes:");
    if (idxs.indexes.length === 0) {
      console.log("  (none)");
    }
    for (const index of idxs.indexes) {
      console.log(`  ${index.key} : ${index.type} on [${index.columns}]`);
    }
    const rows = await db.listRows({
      databaseId,
      tableId,
      queries: [Query.limit(1)],
      total: true,
    });
    console.log(`  rows: ${rows.total ?? rows.rows.length}`);
  } catch (error) {
    console.log(`\n[${tableId}] ERROR ${error?.code} ${error?.message}`);
  }
}
