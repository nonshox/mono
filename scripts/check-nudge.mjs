// Read-only check: would the evening nudge fire for anyone right now?
// Usage: node --env-file=.env scripts/check-nudge.mjs
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
  queries: [Query.equal("nudge", true), Query.limit(50)],
  total: true,
});
console.log(`nudge targets: ${users.total ?? users.rows.length}`);
const today = new Date().toISOString().slice(0, 10);
for (const user of users.rows) {
  const tz = user.tz ?? "(unset → UTC)";
  let localHour = "?";
  try {
    localHour = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: user.tz ?? "UTC",
    }).format(new Date());
  } catch {
    localHour = "invalid tz";
  }
  const rowId = (await import("node:crypto"))
    .createHash("sha256")
    .update(`${user.$id}:${today}`)
    .digest("hex")
    .slice(0, 32);
  let hasEntry = false;
  try {
    await db.getRow({ databaseId, tableId: "days", rowId });
    hasEntry = true;
  } catch {
    hasEntry = false;
  }
  console.log(
    `user ${String(user.$id).slice(0, 8)}…  tz=${tz}  localHour=${localHour}  wroteToday=${hasEntry}  wouldNudge=${localHour === "21" && !hasEntry}`,
  );
}
