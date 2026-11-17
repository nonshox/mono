// Additive, idempotent provisioning. No data is touched.
// Usage: node --env-file=.env scripts/setup-indexes.mjs
import { AppwriteException, Client, TablesDB } from "node-appwrite";

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

const ensureIndex = async (tableId, key, type, columns, orders) => {
  const indexes = await db.listIndexes({ databaseId, tableId });
  if (indexes.indexes.some((index) => index.key === key)) {
    console.log(`${tableId}.${key}: already exists — keeping it`);
    return;
  }
  try {
    await db.createIndex({ databaseId, tableId, key, type, columns, orders });
    console.log(`${tableId}.${key}: created`);
  } catch (error) {
    if (error instanceof AppwriteException) {
      console.log(`${tableId}.${key}: REJECTED (${error.code}) ${error.message}`);
      return;
    }
    throw error;
  }
};

// days: hard uniqueness for the one-row-per-user-per-day invariant.
await ensureIndex("days", "user_day_unique", "unique", ["user", "day"], ["ASC", "ASC"]);

// notifications: cover the page query (filter by recipient, order by $createdAt DESC).
await ensureIndex("notifications", "recipient_created", "key", ["recipient", "$createdAt"], ["ASC", "DESC"]);
