import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  getChallengeDetail,
  setChallengeParticipation,
} from "@/features/challenges/service";
import { AppwriteException } from "node-appwrite";
import { z } from "zod";

const joinSchema = z.object({ join: z.boolean() }).strict();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthAccount("Challenge detail");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to see this challenge.");
  }

  const { id } = await context.params;
  try {
    const detail = await getChallengeDetail(id, auth.account.$id);
    if (!detail) {
      return jsonError(404, "CHALLENGE_NOT_FOUND", "Challenge not found.");
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logFailure("Challenge detail", error);
    return jsonError(502, "CHALLENGE_UNAVAILABLE", "Challenge is unavailable.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Challenge toggle");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to join challenges.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Send { join: true|false }.");
  }

  const { id } = await context.params;
  try {
    const result = await setChallengeParticipation(
      id,
      auth.account.$id,
      parsed.data.join,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      return jsonError(404, "CHALLENGE_NOT_FOUND", "Challenge not found.");
    }
    logFailure("Challenge toggle", error);
    return jsonError(502, "CHALLENGE_TOGGLE_FAILED", "Could not update.");
  }
}
