// Idempotent migration: dump pushups values, drop the pushups index + column.
// Usage: node --env-file=.env scripts/migrate-pushups.mjs
// Backs up to scripts/backups/pushups-YYYY-MM-DD.json before any deletion.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";

for (const name of [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
]) {
  if (!process.env[name]) {
    console.error(`Missing ${name} — fill .env and retry.`);
    process.exit(1);
  }
}
const here = dirname(fileURLToPath(import.meta.url));
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

// 1. Dump every user row's $id + pushups value (only non-null values kept).
const dump = [];
let cursor = null;
for (;;) {
  const page = await db.listRows({
    databaseId,
    tableId: "users",
    queries: [
      Query.limit(100),
      Query.select(["$id", "pushups"]),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ],
    total: false,
  });
  for (const row of page.rows) {
    if (row.pushups !== undefined && row.pushups !== null) {
      dump.push({ id: row.$id, pushups: row.pushups });
    }
  }
  if (page.rows.length < 100) break;
  cursor = page.rows[page.rows.length - 1].$id;
}
const stamp = new Date().toISOString().slice(0, 10);
const backupDir = join(here, "backups");
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, `pushups-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify({ exportedAt: stamp, rows: dump }, null, 2));
console.log(`pushups backup: ${backupPath} (${dump.length} non-null values)`);

// 2. Drop the pushups index if present.
try {
  await db.deleteIndex({ databaseId, tableId: "users", key: "pushups" });
  console.log("pushups index: deleted");
} catch (error) {
  if (error instanceof AppwriteException && error.code === 404) {
    console.log("pushups index: already gone");
  } else throw error;
}

// 3. Drop the pushups column if present.
try {
  await db.deleteColumn({ databaseId, tableId: "users", key: "pushups" });
  console.log("pushups column: deleted");
} catch (error) {
  if (error instanceof AppwriteException && error.code === 404) {
    console.log("pushups column: already gone");
  } else throw error;
}
console.log("Migration complete.");
