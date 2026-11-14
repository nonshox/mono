/**
 * Reward detector backfill. Recomputes badges and challenge completions from
 * scratch for every user and creates any MISSING "unlocked …" / "completed …"
 * notifications. Idempotent — matches on existing (recipient, type) rows, so
 * running it twice changes nothing. Use after hand-editing workout data.
 *
 *   npm run rewards:backfill
 */
import { Client, TablesDB, Query, ID } from "node-appwrite";

try { process.loadEnvFile(".env"); } catch { console.error("Missing .env"); process.exit(1); }
try { process.loadEnvFile(".env.secret"); } catch { /* optional */ }

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY } = process.env;
for (const [k, v] of Object.entries({ APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY })) {
  if (!v) { console.error(`${k} is not set.`); process.exit(1); }
}

const databaseId = APPWRITE_DATABASE_ID;
const tables = new TablesDB(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));

// Mirror of lib/achievements.ts — keep in sync (scripts can't import TS).
const MILESTONES = [
  { id: "first-session", title: "First session", hint: "sessions", min: 1, kind: "sessions" },
  { id: "first-20", title: "Warming up", hint: "reps", min: 20, kind: "reps" },
  { id: "first-50", title: "Getting steady", hint: "reps", min: 50, kind: "reps" },
  { id: "first-100", title: "Century club", hint: "reps", min: 100, kind: "reps" },
  { id: "first-250", title: "Solid build", hint: "reps", min: 250, kind: "reps" },
  { id: "first-500", title: "Strong foundation", hint: "reps", min: 500, kind: "reps" },
  { id: "first-1000", title: "Elite engine", hint: "reps", min: 1000, kind: "reps" },
  { id: "first-streak", title: "Streak holder", hint: "streak", min: 3, kind: "streak" },
  { id: "set-20", title: "Twenty strong", hint: "set", min: 20, kind: "set" },
  { id: "set-50", title: "Fifty force", hint: "set", min: 50, kind: "set" },
  { id: "set-100", title: "Century in one go", hint: "set", min: 100, kind: "set" },
];

async function listAll(tableId, select, extra = []) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = await tables.listRows({
      databaseId,
      tableId,
      queries: [...extra, Query.limit(500), Query.offset(offset), Query.select(select)],
      total: false,
    });
    rows.push(...page.rows);
    if (page.rows.length < 500) break;
  }
  return rows;
}

const [workouts, userIds, challenges, entries] = await Promise.all([
  listAll("workouts", ["user", "kind", "reps", "$createdAt"]),
  listAll("users", ["$id"]).then((r) => r.map((u) => u.$id)),
  listAll("challenges", ["$id", "title", "reps", "starts", "ends"]),
  listAll("entries", ["user", "challenge"]),
]);

const byUser = new Map();
for (const w of workouts) {
  const id = String(w.user);
  if (!byUser.has(id)) byUser.set(id, []);
  byUser.get(id).push(w);
}

async function hasNotification(userId, type) {
  const existing = await tables.listRows({
    databaseId,
    tableId: "notifications",
    queries: [Query.equal("recipient", userId), Query.equal("type", type), Query.limit(1)],
    total: false,
  });
  return existing.rows.length > 0;
}

async function ensureNotification(userId, type, ref) {
  if (await hasNotification(userId, type)) return false;
  await tables.createRow({
    databaseId,
    tableId: "notifications",
    rowId: ID.unique(),
    permissions: [],
    data: { recipient: userId, actor: userId, type, ...(ref ? { ref } : {}), read: false },
  });
  return true;
}

let badgesCreated = 0;
let completionsCreated = 0;

for (const userId of userIds) {
  const sessions = byUser.get(userId) ?? [];
  const totalReps = sessions.reduce((sum, w) => sum + Number(w.reps || 0), 0);
  const bestSet = sessions.reduce((best, w) => Math.max(best, Number(w.reps || 0)), 0);
  const sessionsCount = sessions.length;
  const days = new Set(sessions.map((w) => new Date(w.$createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  for (let offset = 0; ; offset += 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - offset);
    if (days.has(day.toISOString().slice(0, 10))) streak += 1;
    else if (offset === 0) continue;
    else break;
  }

  const stat = { sessions: sessionsCount, reps: totalReps, streak, set: bestSet };
  for (const milestone of MILESTONES) {
    if (stat[milestone.kind] >= milestone.min) {
      const type = `unlocked ${milestone.title}`;
      if (await ensureNotification(userId, type, `achievement:${milestone.id}`)) badgesCreated += 1;
    }
  }

  const joined = new Set(entries.filter((e) => String(e.user) === userId).map((e) => String(e.challenge)));
  for (const challenge of challenges) {
    if (!joined.has(String(challenge.$id))) continue;
    const inWindow = sessions.filter((w) => {
      const t = new Date(w.$createdAt).toISOString();
      return t >= new Date(challenge.starts).toISOString() && t <= new Date(challenge.ends).toISOString();
    });
    const repsInWindow = inWindow.reduce((sum, w) => sum + Number(w.reps || 0), 0);
    if (repsInWindow >= Number(challenge.reps)) {
      const title = String(challenge.title).slice(0, 40);
      if (await ensureNotification(userId, `completed “${title}”`, `challenge:${challenge.$id}`)) completionsCreated += 1;
    }
  }
}

console.log(JSON.stringify({ usersScanned: userIds.length, badgesCreated, completionsCreated }, null, 2));
