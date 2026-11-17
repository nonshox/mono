// Additive, idempotent: add the `actions` string[] column to users.
// Usage: node --env-file=.env scripts/setup-actions.mjs
import { Client, TablesDB } from "node-appwrite";

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
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const columns = await db.listColumns({ databaseId, tableId: "users" });
if (columns.columns.some((column) => column.key === "actions")) {
  console.log("users.actions: already exists — keeping it");
} else {
  await db.createStringColumn({
    databaseId,
    tableId: "users",
    key: "actions",
    required: false,
    size: 64,
    array: true,
    description: "Things the user is actively doing, e.g. [\"read\",\"exam prep\"].",
  });
  console.log("users.actions: created (string[], default [])");
}
