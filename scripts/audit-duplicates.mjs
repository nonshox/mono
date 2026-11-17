// Read-only duplicate scan on days(user, day). Reports, changes nothing.
// Usage: node --env-file=.env scripts/audit-duplicates.mjs
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
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const seen = new Map();
let cursor = null;
let total = 0;
for (;;) {
  const page = await db.listRows({
    databaseId,
    tableId: "days",
    queries: [
      Query.limit(100),
      Query.select(["$id", "user", "day"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ],
    total: false,
  });
  for (const row of page.rows) {
    total += 1;
    const key = `${row.user}|${row.day}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  if (page.rows.length < 100) break;
  cursor = page.rows[page.rows.length - 1].$id;
}
const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
console.log(`days rows scanned: ${total}`);
console.log(duplicates.length === 0 ? "duplicates: none" : `duplicates:\n${duplicates.map(([k, c]) => `  ${k} x${c}`).join("\n")}`);
