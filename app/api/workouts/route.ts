import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  createWorkout,
  getWorkoutSummary,
} from "@/features/workouts/service";
import {
  getActiveChallenges,
  getJoinedChallengeIds,
  notifyChallengeOvertakes,
  repsForUserInWindow,
} from "@/features/challenges/service";
import { createWorkoutSchema } from "@/features/workouts/schemas";
import { notify } from "@/features/notifications/service";
import { getGlobalStandings } from "@/features/leaderboard/service";
import { getUserRow } from "@/features/users/service";
import { MILESTONES, unlockedMilestones } from "@/lib/achievements";

export async function GET() {
  const auth = await getAuthAccount("Workout summary");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to view your progress.");
  }

  try {
    const summary = await getWorkoutSummary(auth.account.$id);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logFailure("Workout summary", error);
    return jsonError(502, "WORKOUTS_UNAVAILABLE", "Your progress is unavailable.");
  }
}

type PreSnapshot = {
  unlocked: string[];
  challenges: Array<{ id: string; title: string; reps: number; before: number }>;
};

/**
 * Milestone/challenge progress BEFORE the new row exists. If this fails we
 * skip reward detection entirely — a missing snapshot must never cause
 * duplicate rewards.
 */
async function snapshotBeforeSave(
  userId: string,
): Promise<PreSnapshot | null> {
  try {
    const [summary, active, joined] = await Promise.all([
      getWorkoutSummary(userId),
      getActiveChallenges(),
      getJoinedChallengeIds(userId),
    ]);

    const unlocked = unlockedMilestones({
      sessions: summary.sessions,
      totalReps: summary.totalReps,
      streak: summary.streak,
      bestSet: summary.bestSet,
    });

    const mine = active.filter((challenge) => joined.has(challenge.id));
    const challenges = await Promise.all(
      mine.map(async (challenge) => ({
        id: challenge.id,
        title: challenge.title,
        reps: challenge.reps,
        before: await repsForUserInWindow(challenge, userId),
      })),
    );
    return { unlocked, challenges };
  } catch (error) {
    logFailure("Workout pre-snapshot", error);
    return null;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Workout save");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to save your session.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Check the workout payload.");
  }

  const userId = auth.account.$id;
  const sessionReps = parsed.data.kind === "pushup" ? parsed.data.reps : 0;

  try {
    const pre = await snapshotBeforeSave(userId);
    const standingsBefore = await getGlobalStandings().catch((error) => {
      logFailure("Leaderboard pre-snapshot", error);
      return null;
    });
    await createWorkout(userId, parsed.data);

    // Rewards + rank — after the row exists. Failures here never affect the save.
    const unlocked: string[] = [];
    const challengesCompleted: string[] = [];
    let challenges: Array<{
      title: string;
      current: number;
      target: number;
      completed: boolean;
    }> = [];
    let rank: number | null = null;
    let totalPushups = 0;

    try {
      const [summary, userRow] = await Promise.all([
        getWorkoutSummary(userId),
        getUserRow(userId).catch(() => null),
      ]);
      const postUnlocked = unlockedMilestones({
        sessions: summary.sessions,
        totalReps: summary.totalReps,
        streak: summary.streak,
        bestSet: summary.bestSet,
      });

      const calls: Promise<void>[] = [];

      if (pre) {
        for (const milestone of postUnlocked) {
          if (pre.unlocked.includes(milestone)) continue;
          const title =
            MILESTONES.find((m) => m.id === milestone)?.title ?? milestone;
          unlocked.push(title);
          calls.push(
            notify(userId, userId, `unlocked ${title}`, `achievement:${milestone}`, true),
          );
        }

        for (const challenge of pre.challenges) {
          const after = challenge.before + sessionReps;
          if (challenge.before >= challenge.reps || after < challenge.reps) {
            continue;
          }
          challengesCompleted.push(challenge.title);
          calls.push(
            notify(
              userId,
              userId,
              `completed “${challenge.title.slice(0, 40)}”`,
              `challenge:${challenge.id}`,
              true,
            ),
          );
        }
      }

      if (pre) {
        challenges = pre.challenges.map((challenge) => ({
          title: challenge.title,
          target: challenge.reps,
          current: Math.min(challenge.reps, challenge.before + sessionReps),
          completed:
            challenge.before < challenge.reps &&
            challenge.before + sessionReps >= challenge.reps,
        }));
      }

      const standingsAfter = await getGlobalStandings().catch((error) => {
        logFailure("Leaderboard post-snapshot", error);
        return null;
      });

      if (standingsBefore && standingsAfter && sessionReps > 0) {
        const beforeRank = standingsBefore.rankOf.get(userId) ?? null;
        const afterRank = standingsAfter.rankOf.get(userId) ?? null;
        if (afterRank !== null && (beforeRank === null || afterRank < beforeRank)) {
          const passed =
            beforeRank === null
              ? // Entering the board — the athlete right below you is the one you displaced.
                standingsAfter.ordered.slice(afterRank, afterRank + 1)
              : standingsAfter.ordered.slice(afterRank - 1, beforeRank - 1);
          for (const recipient of passed.slice(0, 10)) {
            // Skip ties at your new rank — those athletes weren't passed.
            if (
              recipient !== userId &&
              standingsAfter.rankOf.get(recipient) !== afterRank
            ) {
              calls.push(notify(recipient, userId, "overtook you", "leaderboard"));
            }
          }
        }
      }

      rank = standingsAfter?.rankOf.get(userId) ?? null;
      totalPushups = userRow?.pushups ?? summary.totalReps;
      await Promise.allSettled(calls);
    } catch (error) {
      logFailure("Workout rewards", error);
    }

    if (sessionReps > 0) {
      try {
        await notifyChallengeOvertakes(userId, sessionReps);
      } catch (error) {
        logFailure("Challenge overtakes", error);
      }
    }

    return NextResponse.json(
      { saved: true, unlocked, challengesCompleted, challenges, rank, totalPushups },
      { status: 201 },
    );
  } catch (error) {
    logFailure("Workout save", error);
    return jsonError(502, "WORKOUT_SAVE_FAILED", "Your session could not be saved.");
  }
}
