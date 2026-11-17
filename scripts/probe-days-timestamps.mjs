// Read-only: dump day rows with their $createdAt so we can see the real local days.
// Usage: node --env-file=.env scripts/probe-days-timestamps.mjs
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

const users = await db.listRows({
  databaseId,
  tableId: "users",
  queries: [Query.limit(10)],
  total: false,
});
for (const user of users.rows) {
  console.log(`user=${String(user.$id).slice(0, 8)}…  tz=${user.tz ?? "(unset)"}  name=${user.name || "(unset)"}`);
}

const rows = await db.listRows({
  databaseId,
  tableId: "days",
  queries: [Query.limit(20), Query.orderAsc("day")],
  total: false,
});
for (const row of rows.rows) {
  console.log(
    `day=${row.day}  createdAt=${row.$createdAt}  updatedAt=${row.$updatedAt}  satisfied=${row.satisfied ?? "-"}  text=${JSON.stringify(row.text.slice(0, 80))}`,
  );
}
