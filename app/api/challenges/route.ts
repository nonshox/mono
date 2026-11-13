import { NextResponse } from "next/server";
import { getAuthAccount, jsonError, logFailure } from "@/lib/http";
import {
  getActiveChallenges,
  getJoinedChallengeIds,
} from "@/features/challenges/service";

export async function GET() {
  const auth = await getAuthAccount("Challenges list");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to see challenges.");
  }

  try {
    const [challenges, joinedIds] = await Promise.all([
      getActiveChallenges(),
      getJoinedChallengeIds(auth.account.$id),
    ]);
    const payload = challenges.map((challenge) => ({
      challenge,
      joined: joinedIds.has(challenge.id),
    }));

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    logFailure("Challenges list", error);
    return jsonError(502, "CHALLENGES_UNAVAILABLE", "Challenges are unavailable.");
  }
}
