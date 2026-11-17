// Rebuild the `notifications` table with Mono-native keys.
// Idempotent — creates whatever is missing, drops only the old schema.
//   - dry-run (default): prints the plan, changes nothing.
//   - `--yes`: executes the plan.
//
// Usage: node --env-file=.env scripts/migrate-notifications.mjs [--yes]
import { Client, Query, TablesDB } from "node-appwrite";

const confirmed = process.argv.includes("--yes");

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

const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = "notifications";

async function tableExists() {
  try {
    await db.getTable({ databaseId, tableId });
    return true;
  } catch {
    return false;
  }
}

async function columnKeys() {
  const cols = await db.listColumns({ databaseId, tableId });
  return cols.columns.map((column) => column.key);
}

async function indexKeys() {
  const indexes = await db.listIndexes({ databaseId, tableId });
  return indexes.indexes.map((index) => index.key);
}

// [key, create] — executed only for keys that are missing.
const columnSpecs = [
  ["user", (id, t) => db.createStringColumn({ databaseId: id, tableId: t, key: "user", size: 36, required: true })],
  ["kind", (id, t) => db.createStringColumn({ databaseId: id, tableId: t, key: "kind", size: 32, required: true })],
  ["body", (id, t) => db.createStringColumn({ databaseId: id, tableId: t, key: "body", size: 280, required: true })],
  ["ref", (id, t) => db.createStringColumn({ databaseId: id, tableId: t, key: "ref", size: 200, required: false })],
  ["read", (id, t) => db.createBooleanColumn({ databaseId: id, tableId: t, key: "read", required: true })],
];

const indexSpecs = [
  ["user", ["user"]],
  ["user_read", ["user", "read"]],
];

const exists = await tableExists();
let keys = exists ? await columnKeys() : [];

const isOldSchema =
  keys.includes("recipient") || keys.includes("actor") || keys.includes("type");

if (exists && isOldSchema) {
  const rows = await db.listRows({
    databaseId,
    tableId,
    queries: [Query.limit(1)],
    total: true,
  });
  console.log(`old schema detected — columns: ${keys.join(", ")}; old rows: ${rows.total ?? rows.rows.length}`);
  if (!confirmed) {
    console.log("dry-run: would DROP the table and recreate the Mono-native schema.");
    console.log("re-run with --yes to execute.");
    process.exit(0);
  }
  console.log("dropping old notifications table…");
  await db.deleteTable({ databaseId, tableId });
  await db.createTable({
    databaseId,
    tableId,
    name: "notifications",
    permissions: [],
    rowSecurity: true,
  });
  keys = [];
} else if (!exists) {
  if (!confirmed) {
    console.log("notifications does not exist — dry-run: would create the Mono-native schema.");
    console.log("re-run with --yes to execute.");
    process.exit(0);
  }
  await db.createTable({
    databaseId,
    tableId,
    name: "notifications",
    permissions: [],
    rowSecurity: true,
  });
  keys = [];
}

const missingColumns = columnSpecs.map(([key]) => key).filter((key) => !keys.includes(key));
const haveIndexes = exists && !isOldSchema ? await indexKeys() : [];
const missingIndexes = indexSpecs.filter(([key]) => !haveIndexes.includes(key));

if (missingColumns.length === 0 && missingIndexes.length === 0) {
  console.log("notifications is already complete — nothing to do.");
  process.exit(0);
}

console.log(`plan: create columns [${missingColumns.join(", ") || "none"}], indexes [${missingIndexes.map(([k]) => k).join(", ") || "none"}]`);
if (!confirmed) {
  console.log("dry-run only — re-run with --yes to execute.");
  process.exit(0);
}

for (const [key, create] of columnSpecs) {
  if (!missingColumns.includes(key)) continue;
  await create(databaseId, tableId);
  console.log(`created column ${key}`);
}
for (const [key, columns] of missingIndexes) {
  await db.createIndex({ databaseId, tableId, key, type: "key", columns });
  console.log(`created index ${key} on [${columns.join(", ")}]`);
}
console.log("notifications rebuilt: user, kind, body, ref, read");
