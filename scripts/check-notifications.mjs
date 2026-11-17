// Read-only verification of the notifications table.
// Usage: node --env-file=.env scripts/check-notifications.mjs
import { Client, Query, TablesDB } from "node-appwrite";

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
const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const cols = await db.listColumns({ databaseId, tableId: "notifications" });
for (const col of cols.columns) {
  console.log(`col ${col.key} : ${col.type}${col.required ? " required" : ""}`);
}
const idxs = await db.listIndexes({ databaseId, tableId: "notifications" });
for (const index of idxs.indexes) {
  console.log(`idx ${index.key} : ${index.type} on [${index.columns}]`);
}
const rows = await db.listRows({
  databaseId,
  tableId: "notifications",
  queries: [Query.limit(5)],
  total: true,
});
console.log(`rows: ${rows.total ?? rows.rows.length}`);
