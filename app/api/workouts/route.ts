import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { createWorkout, getWorkoutSummary } from "@/features/workouts/service";
import { notifyChallengeOvertakes } from "@/features/challenges/service";
import { createWorkoutSchema } from "@/features/workouts/schemas";

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

  try {
    await createWorkout(auth.account.$id, parsed.data);
    const sessionReps = parsed.data.kind === "pushup" ? parsed.data.reps : 0;
    if (sessionReps > 0) {
      await notifyChallengeOvertakes(auth.account.$id, sessionReps);
    }
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    logFailure("Workout save", error);
    return jsonError(502, "WORKOUT_SAVE_FAILED", "Your session could not be saved.");
  }
}
