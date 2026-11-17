// Additive, idempotent: add the indexes the cron routes actually hit.
//   - dry-run (default): prints the plan, changes nothing.
//   - `--yes`: creates the indexes.
//
// Why: listLetterTargets() queries ai=true and listNudgeTargets() queries
// nudge=true — both were full-table scans. Both cron routes run hourly /
// weekly. This is the entire justification; no blind indexing.
//
// Usage: node --env-file=.env scripts/setup-users-indexes.mjs [--yes]
import { Client, TablesDB } from "node-appwrite";

const confirmed = process.argv.includes("--yes");

const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = "users";

const have = await db.listIndexes({ databaseId, tableId });
const haveKeys = new Set(have.indexes.map((index) => index.key));

const wanted = [
  ["ai", ["ai"]],
  ["nudge", ["nudge"]],
];

const missing = wanted.filter(([key]) => !haveKeys.has(key));
if (missing.length === 0) {
  console.log("users indexes already present — nothing to add.");
  process.exit(0);
}

console.log(`plan: create indexes ${missing.map(([k]) => k).join(", ")} on users`);
if (!confirmed) {
  console.log("dry-run only — re-run with --yes to create them.");
  process.exit(0);
}

for (const [key, columns] of missing) {
  await db.createIndex({ databaseId, tableId, key, type: "key", columns });
  console.log(`created index ${key} on [${columns.join(", ")}]`);
}
console.log("done.");
