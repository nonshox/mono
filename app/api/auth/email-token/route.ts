import { Account } from "node-appwrite";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { emailTokenRequestSchema } from "@/features/auth/schemas";
import {
  appwriteStatus,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { createAccountClient } from "@/lib/appwrite/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const ip = clientIp(request);
  const limited = rateLimit("auth:email-token", ip, 10, 10 * 60_000);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many attempts. Try again in ${limited.retryAfterSeconds}s.`,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = emailTokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Enter a valid email address.");
  }

  try {
    const account = new Account(createAccountClient());
    const token = await account.createEmailToken({
      userId: randomUUID(),
      email: parsed.data.email,
    });

    return NextResponse.json({
      userId: token.userId,
      expiresAt: token.expire,
    });
  } catch (error) {
    const status = appwriteStatus(error);
    logFailure("Email code request", error);
    return jsonError(
      status ?? 502,
      status === 429 ? "RATE_LIMITED" : "EMAIL_CODE_UNAVAILABLE",
      status === 429
        ? "Too many requests. Please wait before trying again."
        : "We could not send a sign-in code right now. Please try again.",
    );
  }
}
