// Read-only probe — does the database answer right now?
// Usage: node --env-file=.env scripts/probe-appwrite.mjs
import { Client, TablesDB, Query } from "node-appwrite";

const c = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(c);

for (const table of ["days", "users", "timeline", "notifications"]) {
  try {
    const r = await db.listRows({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      tableId: table,
      queries: [Query.limit(1)],
      total: true,
    });
    console.log(`${table}: OK (total=${r.total ?? r.rows.length})`);
  } catch (e) {
    console.log(`${table}: FAIL code=${e?.code} ${e?.message}`);
  }
}
