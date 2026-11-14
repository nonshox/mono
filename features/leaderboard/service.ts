import "server-only";
import { Query, type Models } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import { getUsersByIds } from "@/features/users/service";
import type { WorkoutRow } from "@/features/workouts/types";

export type LeaderboardWindow = "today" | "week" | "month" | "all";

export type RankedEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  reps: number;
  trend: "up" | "down" | "same" | "new";
  isYou: boolean;
};

export type LeaderboardResult = {
  window: LeaderboardWindow;
  entries: RankedEntry[];
  viewer: { rank: number | null; reps: number; trend: RankedEntry["trend"] };
  totalRanked: number;
};

const tableId = "workouts";
const usersTable = "users";
const MAX_ROWS = 3000;

type Totals = Map<string, { inWindow: number; before: number }>;

type UserRow = Models.Row & {
  name: string;
  avatar?: string;
  pushups?: number;
};

/** Everyone with at least one verified push-up, best first, with the counter. */
async function listRankedUsers(): Promise<UserRow[]> {
  const result = await getTables().listRows<UserRow>({
    databaseId: getDatabaseId(),
    tableId: usersTable,
    queries: [
      Query.greaterThan("pushups", 0),
      Query.orderDesc("pushups"),
      Query.limit(500),
      Query.select(["$id", "name", "avatar", "pushups"]),
    ],
    total: false,
  });
  return result.rows;
}

function windowStart(window: LeaderboardWindow): Date {
  const now = new Date();
  if (window === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (window === "week") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = start.getUTCDay();
    const offset = (day + 6) % 7; // Monday-first week
    start.setUTCDate(start.getUTCDate() - offset);
    return start;
  }
  if (window === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(0);
}

/** Competition ranking ("1224") over entries with at least one rep. */
function competitionRanks(
  ids: string[],
  repsOf: (id: string) => number,
): Map<string, number> {
  const ranked = [...ids]
    .map((id) => ({ id, reps: repsOf(id) }))
    .filter((entry) => entry.reps > 0)
    .sort((a, b) => b.reps - a.reps);
  const ranks = new Map<string, number>();
  for (let i = 0; i < ranked.length; i += 1) {
    ranks.set(
      ranked[i].id,
      i > 0 && ranked[i - 1].reps === ranked[i].reps
        ? ranks.get(ranked[i - 1].id)!
        : i + 1,
    );
  }
  return ranks;
}

/**
 * All-time board, straight from the per-user counter maintained at write time â€”
 * O(top-N), no full table scan of workouts.
 */
async function allTimeBoard(viewerId: string): Promise<LeaderboardResult> {
  const rows = await listRankedUsers();
  const ids = rows.map((row) => row.$id);
  const pushupsById = new Map(
    rows.map((row) => [row.$id, Number(row.pushups ?? 0)]),
  );
  const counter = (id: string) => pushupsById.get(id) ?? 0;

  const ranked = competitionRanks(ids, counter);
  const sorted = [...ranked.entries()]
    .map(([userId, rank]) => ({ userId, rank }))
    .sort((a, b) => a.rank - b.rank || counter(b.userId) - counter(a.userId));

  const entries: RankedEntry[] = sorted.slice(0, 50).map(({ userId, rank }) => {
    const row = rows.find((r) => r.$id === userId);
    return {
      rank,
      userId,
      name: row?.name?.trim() || "Athlete",
      avatar: row?.avatar ?? "",
      reps: counter(userId),
      trend: "same",
      isYou: userId === viewerId,
    };
  });

  // Viewer may be outside the top-500 fetch; rank by counting strictly better counters.
  let viewerRank = ranked.get(viewerId) ?? null;
  const mine = await viewerPushups(viewerId);
  if (viewerRank === null && mine > 0) {
    try {
      const ahead = await getTables().listRows({
        databaseId: getDatabaseId(),
        tableId: usersTable,
        queries: [Query.greaterThan("pushups", mine), Query.limit(1)],
        total: true,
      });
      viewerRank = ahead.total + 1;
    } catch {
      viewerRank = null;
    }
  }

  return {
    window: "all",
    entries,
    viewer: { rank: viewerRank, reps: mine, trend: "same" },
    totalRanked: ranked.size,
  };
}

async function viewerPushups(userId: string): Promise<number> {
  try {
    const row = await getTables().getRow<UserRow>({
      databaseId: getDatabaseId(),
      tableId: usersTable,
      rowId: userId,
    });
    return Number(row.pushups ?? 0);
  } catch (error) {
    if (isNotFound(error)) return 0;
    throw error;
  }
}

/**
 * Windowed board â€” still needs an in-window scan of workouts (no rolling
 * aggregates without a scheduler), but reads are narrow and indexed on $createdAt.
 */
async function windowedBoard(
  viewerId: string,
  window: LeaderboardWindow,
): Promise<LeaderboardResult> {
  const start = windowStart(window);

  let rows: WorkoutRow[];
  try {
    const result = await getTables().listRows<WorkoutRow>({
      databaseId: getDatabaseId(),
      tableId,
      queries: [
        Query.equal("kind", "pushup"),
        Query.greaterThanEqual("$createdAt", start.toISOString()),
        Query.limit(MAX_ROWS),
        Query.select(["user", "reps", "$createdAt"]),
      ],
      total: false,
    });
    rows = result.rows;
  } catch (error) {
    if (isNotFound(error)) rows = [];
    else throw error;
  }

  // "Before the window" still needs the pre-window history â€” one aggregated scan.
  let beforeRows: WorkoutRow[];
  try {
    const result = await getTables().listRows<WorkoutRow>({
      databaseId: getDatabaseId(),
      tableId,
      queries: [
        Query.equal("kind", "pushup"),
        Query.lessThan("$createdAt", start.toISOString()),
        Query.limit(MAX_ROWS),
        Query.select(["user", "reps"]),
      ],
      total: false,
    });
    beforeRows = result.rows;
  } catch {
    beforeRows = [];
  }

  const totals: Totals = new Map();
  for (const row of rows) {
    const userId = String(row.user);
    const reps = Number(row.reps) || 0;
    if (reps <= 0) continue;
    const bucket = totals.get(userId) ?? { inWindow: 0, before: 0 };
    bucket.inWindow += reps;
    totals.set(userId, bucket);
  }
  for (const row of beforeRows) {
    const userId = String(row.user);
    const reps = Number(row.reps) || 0;
    if (reps <= 0) continue;
    const bucket = totals.get(userId) ?? { inWindow: 0, before: 0 };
    bucket.before += reps;
    totals.set(userId, bucket);
  }

  const userIds = [...totals.keys()];
  const users = await getUsersByIds(userIds);

  const currentReps = (id: string) => totals.get(id)?.inWindow ?? 0;
  const previousReps = (id: string) => totals.get(id)?.before ?? 0;
  const nowRank = competitionRanks(userIds, currentReps);
  const beforeRank = competitionRanks(userIds, previousReps);

  const trendFor = (id: string): RankedEntry["trend"] => {
    if (!beforeRank.has(id)) return "new";
    const prev = beforeRank.get(id)!;
    const curr = nowRank.get(id) ?? Number.MAX_SAFE_INTEGER;
    if (curr < prev) return "up";
    if (curr > prev) return "down";
    return "same";
  };

  const sorted = [...nowRank.entries()]
    .map(([userId, rank]) => ({ userId, rank }))
    .sort((a, b) => a.rank - b.rank || currentReps(b.userId) - currentReps(a.userId));

  const entries: RankedEntry[] = sorted.slice(0, 50).map(({ userId, rank }) => ({
    rank,
    userId,
    name: users.get(userId)?.name || "Athlete",
    avatar: users.get(userId)?.avatar ?? "",
    reps: currentReps(userId),
    trend: trendFor(userId),
    isYou: userId === viewerId,
  }));

  return {
    window,
    entries,
    viewer: {
      rank: nowRank.get(viewerId) ?? null,
      reps: currentReps(viewerId),
      trend: trendFor(viewerId),
    },
    totalRanked: nowRank.size,
  };
}

/**
 * Aggregates verified push-ups per user and ranks them. Position movement is
 * measured against the moment the current window opened: players with no
 * reps before the window are marked "new". All profiles are public.
 */
export async function getGlobalLeaderboard(
  viewerId: string,
  window: LeaderboardWindow,
): Promise<LeaderboardResult> {
  return window === "all" ? allTimeBoard(viewerId) : windowedBoard(viewerId, window);
}

/** Rank + verified push-up total, used for the post-session summary. */
export async function getGlobalRank(
  userId: string,
): Promise<{ rank: number | null; totalPushups: number }> {
  const result = await getGlobalLeaderboard(userId, "all");
  return { rank: result.viewer.rank, totalPushups: result.viewer.reps };
}

export type Standings = {
  /** Every ranked user, best rank first. */
  ordered: string[];
  /** Competition rank of each user in `ordered`. */
  rankOf: Map<string, number>;
};

/**
 * All-time ordering of the board, from the per-user counters â€” used by the
 * workout save flow to detect who a session overtook.
 */
export async function getGlobalStandings(): Promise<Standings> {
  const rows = await listRankedUsers();
  const ids = rows.map((row) => row.$id);
  const counter = new Map(
    rows.map((row) => [row.$id, Number(row.pushups ?? 0)]),
  );
  const rankOf = competitionRanks(ids, (id) => counter.get(id) ?? 0);
  const ordered = [...rankOf.entries()]
    .map(([userId, rank]) => ({ userId, rank }))
    .sort((a, b) => a.rank - b.rank || (counter.get(b.userId) ?? 0) - (counter.get(a.userId) ?? 0))
    .map(({ userId }) => userId);
  return { ordered, rankOf };
}
