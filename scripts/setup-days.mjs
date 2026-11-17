// One-off, idempotent provisioning for the days journal + nudge flag.
// Usage: node --env-file=.env scripts/setup-days.mjs
import { AppwriteException, Client, TablesDB } from "node-appwrite";

const required = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing ${name} — fill .env and retry.`);
    process.exit(1);
  }
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const tableExists = async (tableId) => {
  try {
    await db.getTable({ databaseId, tableId });
    return true;
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return false;
    throw error;
  }
};

if (await tableExists("days")) {
  console.log("days: already exists — keeping it");
} else {
  await db.createTable({
    databaseId,
    tableId: "days",
    name: "days",
    permissions: [],
    columns: [
      { key: "user", type: "string", size: 36, required: true },
      { key: "day", type: "string", size: 10, required: true },
      { key: "text", type: "string", size: 1000, required: true },
    ],
    indexes: [{ key: "user", type: "key", attributes: ["user"], orders: ["ASC"] }],
  });
  console.log("days: created (user, day, text + key on user)");
}

if (await tableExists("timeline")) {
  console.log("timeline: already exists — keeping it");
} else {
  await db.createTable({
    databaseId,
    tableId: "timeline",
    name: "timeline",
    permissions: [],
    columns: [
      { key: "user", type: "string", size: 36, required: true },
      { key: "bucket", type: "string", size: 8, required: true },
      { key: "text", type: "string", size: 160, required: true },
      { key: "order", type: "integer", required: true },
      { key: "done", type: "boolean", required: true },
    ],
    indexes: [{ key: "user", type: "key", attributes: ["user"], orders: ["ASC"] }],
  });
  console.log("timeline: created (user, bucket, text, order, done + key on user)");
}

const dayColumns = await db.listColumns({ databaseId, tableId: "days" });
const ensureIntegerColumn = async (key) => {
  if (dayColumns.columns.some((column) => column.key === key)) {
    console.log(`days.${key}: already exists — keeping it`);
    return;
  }
  await db.createIntegerColumn({
    databaseId,
    tableId: "days",
    key,
    required: false,
    xdefault: null,
  });
  console.log(`days.${key}: created (default null)`);
};

await ensureIntegerColumn("satisfied");

const columns = await db.listColumns({ databaseId, tableId: "users" });
const ensureBooleanColumn = async (key) => {
  if (columns.columns.some((column) => column.key === key)) {
    console.log(`users.${key}: already exists — keeping it`);
    return;
  }
  await db.createBooleanColumn({
    databaseId,
    tableId: "users",
    key,
    required: false,
    xdefault: false,
  });
  console.log(`users.${key}: created (default false)`);
};

const ensureStringColumn = async (key, size) => {
  if (columns.columns.some((column) => column.key === key)) {
    console.log(`users.${key}: already exists — keeping it`);
    return;
  }
  await db.createStringColumn({
    databaseId,
    tableId: "users",
    key,
    required: false,
    size,
    xdefault: null,
  });
  console.log(`users.${key}: created (optional, default null)`);
};

await ensureBooleanColumn("nudge");
await ensureBooleanColumn("ai");

// IANA timezone (e.g. "America/New_York") — drives the evening nudge hour.
await ensureStringColumn("tz", 64);

console.log("Setup complete.");
