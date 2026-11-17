// Read-only: show kind distribution — not body text (privacy preserved).
// Usage: node --env-file=.env scripts/probe-notification-kinds.mjs
import { Client, Query, TablesDB } from "node-appwrite";

const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const rows = await db.listRows({
  databaseId: process.env.APPWRITE_DATABASE_ID,
  tableId: "notifications",
  queries: [Query.limit(10)],
  total: false,
});
for (const row of rows.rows) {
  console.log(`kind=${row.kind}  ref=${JSON.stringify(row.ref ?? "")}  read=${row.read}`);
}
