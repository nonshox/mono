/**
 * One-shot counter backfill. Recomputes every user's lifetime verified
 * push-ups from `workouts` and writes the absolute value to `users.pushups`.
 * Idempotent — safe to run as often as needed (e.g. after manual data edits).
 *
 *   npm run counters:backfill
 */
import { Client, TablesDB, Query, AppwriteException } from "node-appwrite";

try { process.loadEnvFile(".env"); } catch { console.error("Missing .env"); process.exit(1); }
try { process.loadEnvFile(".env.secret"); } catch { /* optional */ }

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY } = process.env;
for (const [k, v] of Object.entries({ APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY })) {
  if (!v) { console.error(`${k} is not set.`); process.exit(1); }
}

const databaseId = APPWRITE_DATABASE_ID;
const tables = new TablesDB(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));

async function listAllWorkouts() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = await tables.listRows({
      databaseId,
      tableId: "workouts",
      queries: [
        Query.equal("kind", "pushup"),
        Query.limit(500),
        Query.offset(offset),
        Query.select(["user", "reps"]),
      ],
      total: false,
    });
    rows.push(...page.rows);
    if (page.rows.length < 500) break;
  }
  return rows;
}

async function listAllUserIds() {
  const ids = [];
  for (let offset = 0; ; offset += 500) {
    const page = await tables.listRows({
      databaseId,
      tableId: "users",
      queries: [Query.limit(500), Query.offset(offset), Query.select(["$id"])],
      total: false,
    });
    ids.push(...page.rows.map((row) => row.$id));
    if (page.rows.length < 500) break;
  }
  return ids;
}

const [rows, userIds] = await Promise.all([listAllWorkouts(), listAllUserIds()]);

const totals = new Map();
for (const row of rows) {
  const id = String(row.user);
  totals.set(id, (totals.get(id) ?? 0) + (Number(row.reps) || 0));
}

let updated = 0;
let unchanged = 0;
for (const userId of userIds) {
  const pushups = totals.get(userId) ?? 0;
  try {
    await tables.updateRow({
      databaseId,
      tableId: "users",
      rowId: userId,
      data: { pushups },
    });
    updated += 1;
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) continue;
    throw error;
  }
}
console.log(JSON.stringify({ usersScanned: userIds.length, usersUpdated: updated, unchanged, pushupRows: rows.length }, null, 2));
