import "server-only";
import { Query } from "node-appwrite";
import { AppwriteException } from "node-appwrite";
import { getDatabaseId, getTables, isNotFound } from "@/lib/appwrite/tables";
import { getUsersByIds } from "@/features/users/service";
import { notify } from "@/features/notifications/service";
import type { Models } from "node-appwrite";
import type {
  Challenge,
  ChallengeDetail,
  ChallengeRow,
  LeaderboardEntry,
} from "./types";
import type { WorkoutRow } from "@/features/workouts/types";

type EntryRow = Models.Row & { challenge: string; user: string };

const challengesTable = "challenges";
const entriesTable = "entries";

const toChallenge = (row: ChallengeRow): Challenge => ({
  id: row.$id,
  title: row.title,
  reps: row.reps,
  window: row.window,
  starts: row.starts,
  ends: row.ends,
  isActive: row.active,
});

export async function getActiveChallenges(): Promise<Challenge[]> {
  const now = new Date().toISOString();
  const result = await getTables().listRows<ChallengeRow>({
    databaseId: getDatabaseId(),
    tableId: challengesTable,
    queries: [
      Query.equal("active", true),
      Query.lessThanEqual("starts", now),
      Query.greaterThanEqual("ends", now),
      Query.orderAsc("ends"),
      Query.limit(20),
    ],
    total: false,
  });
  return result.rows.map(toChallenge);
}

export async function getJoinedChallengeIds(
  userId: string,
): Promise<Set<string>> {
  const result = await getTables().listRows<EntryRow>({
    databaseId: getDatabaseId(),
    tableId: entriesTable,
    queries: [
      Query.equal("user", userId),
      Query.limit(100),
      Query.select(["challenge"]),
    ],
    total: false,
  });
  return new Set(result.rows.map((row) => String(row.challenge)));
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  try {
    const row = await getTables().getRow<ChallengeRow>({
      databaseId: getDatabaseId(),
      tableId: challengesTable,
      rowId: id,
    });
    return toChallenge(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function repsByUserInWindow(
  challenge: Challenge,
): Promise<Map<string, number>> {
  const result = await getTables().listRows<WorkoutRow>({
    databaseId: getDatabaseId(),
    tableId: "workouts",
    queries: [
      Query.equal("kind", "pushup"),
      Query.greaterThanEqual("$createdAt", challenge.starts),
      Query.lessThanEqual("$createdAt", challenge.ends),
      Query.limit(5000),
      Query.select(["user", "reps"]),
    ],
    total: false,
  });
  const map = new Map<string, number>();
  for (const row of result.rows) {
    const user = String(row.user);
    map.set(user, (map.get(user) ?? 0) + Number(row.reps || 0));
  }
  return map;
}

async function joinedUserIds(challengeId: string): Promise<string[]> {
  const result = await getTables().listRows<EntryRow>({
    databaseId: getDatabaseId(),
    tableId: entriesTable,
    queries: [
      Query.equal("challenge", challengeId),
      Query.limit(500),
      Query.select(["user"]),
    ],
    total: false,
  });
  return result.rows.map((row) => String(row.user));
}

export async function getChallengeDetail(
  challengeId: string,
  viewerId: string,
): Promise<ChallengeDetail | null> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return null;

  const entries = await joinedUserIds(challengeId);
  const userIds = [...new Set([...entries, viewerId])];
  const reps = await repsByUserInWindow(challenge);
  const users = await getUsersByIds(userIds);

  const leaderMap = new Map<string, number>();
  for (const id of entries) leaderMap.set(id, reps.get(id) ?? 0);
  if (!entries.includes(viewerId)) {
    leaderMap.set(viewerId, reps.get(viewerId) ?? 0);
  }

  const leaderboard: LeaderboardEntry[] = [...leaderMap.entries()]
    .map(([id, reps]) => ({
      rank: 0,
      userId: id,
      name: users.get(id)?.name || "Someone",
      avatar: users.get(id)?.avatar ?? "",
      reps,
      isYou: id === viewerId,
    }))
    .sort((a, b) => b.reps - a.reps)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 50);

  return {
    ...challenge,
    joined: entries.includes(viewerId),
    myReps: reps.get(viewerId) ?? 0,
    memberCount: entries.length,
    leaderboard,
  };
}

export async function notifyChallengeOvertakes(
  actorId: string,
  actorDeltaReps: number,
): Promise<void> {
  const challenges = await getActiveChallenges();
  const joined = await getJoinedChallengeIds(actorId);

  for (const challenge of challenges) {
    if (!joined.has(challenge.id)) continue;
    const members = await joinedUserIds(challenge.id);
    if (!members.includes(actorId)) continue;

    const reps = await repsByUserInWindow(challenge);

    const actorAfter = reps.get(actorId) ?? 0;
    const actorBefore = Math.max(0, actorAfter - actorDeltaReps);

    const beforeRanked = members
      .map((id) => ({ id, reps: id === actorId ? actorBefore : (reps.get(id) ?? 0) }))
      .sort((a, b) => b.reps - a.reps);
    const afterRanked = members
      .map((id) => ({ id, reps: id === actorId ? actorAfter : (reps.get(id) ?? 0) }))
      .sort((a, b) => b.reps - a.reps);

    const actorBeforeIdx = beforeRanked.findIndex((x) => x.id === actorId);
    const actorAfterIdx = afterRanked.findIndex((x) => x.id === actorId);
    if (actorAfterIdx < 0 || actorBeforeIdx < 0) continue;

    const passed = afterRanked
      .slice(actorAfterIdx + 1, actorBeforeIdx + 1)
      .map((entry) => entry.id);

    for (const recipient of passed) {
      try {
        await notify(recipient, actorId, "overtook you", challenge.id);
      } catch {
        // Swallow so one failed notification doesn't break workout completion.
      }
    }
  }
}

export async function setChallengeParticipation(
  challengeId: string,
  userId: string,
  join: boolean,
): Promise<{ joined: boolean }> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) {
    throw new AppwriteException(
      "challenge_not_found",
      404,
      "Challenge not found",
    );
  }

  const existing = await getTables().listRows<EntryRow>({
    databaseId: getDatabaseId(),
    tableId: entriesTable,
    queries: [
      Query.equal("challenge", challengeId),
      Query.equal("user", userId),
      Query.limit(1),
      Query.select(["$id"]),
    ],
    total: false,
  });
  const rowId = existing.rows[0]?.$id;

  if (join) {
    if (!rowId) {
      try {
        await getTables().createRow({
          databaseId: getDatabaseId(),
          tableId: entriesTable,
          rowId: `${challengeId}_${userId}`.slice(0, 36),
          permissions: [],
          data: { challenge: challengeId, user: userId },
        });
      } catch (error) {
        if (!(error instanceof AppwriteException && error.code === 409)) {
          throw error;
        }
      }
    }
    return { joined: true };
  }

  if (rowId) {
    await getTables().deleteRow({
      databaseId: getDatabaseId(),
      tableId: entriesTable,
      rowId,
    });
  }
  return { joined: false };
}
