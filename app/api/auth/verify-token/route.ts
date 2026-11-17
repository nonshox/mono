import { Account } from "node-appwrite";
import { NextResponse } from "next/server";
import { emailTokenVerifySchema } from "@/features/auth/schemas";
import { NO_STORE_HEADERS, appwriteStatus,
  isSameOrigin,
  jsonError,
  logFailure } from "@/lib/http";
import {
  createAccountClient,
  createAdminClient,
  getSessionCookieName,
} from "@/lib/appwrite/server";
import { ensureUserForAccount } from "@/features/users/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const ip = clientIp(request);
  const limited = rateLimit("auth:verify-token", ip, 20, 10 * 60_000);
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

  const parsed = emailTokenVerifySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_INPUT",
      "Enter the six-digit code from your email.",
    );
  }

  try {
    const account = new Account(createAdminClient());
    const session = await account.createSession(parsed.data);
    const expiresAt = new Date(session.expire);

    if (
      !session.secret ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt <= new Date()
    ) {
      throw new Error("Appwrite returned an invalid session.");
    }

    const signedInAccount = await new Account(
      createAccountClient(session.secret),
    ).get();
    await ensureUserForAccount(signedInAccount.$id, signedInAccount.email);

    const response = NextResponse.json(
      { ok: true },
      { headers: NO_STORE_HEADERS },
    );
    response.cookies.set(getSessionCookieName(), session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    const status = appwriteStatus(error);
    if (status === 401) {
      return jsonError(
        401,
        "INVALID_OR_EXPIRED_CODE",
        "That code is invalid or has expired. Request a new one and try again.",
      );
    }

    logFailure("Email code verification", error);
    return jsonError(
      status ?? 502,
      status === 429 ? "RATE_LIMITED" : "SIGN_IN_UNAVAILABLE",
      status === 429
        ? "Too many attempts. Please wait before trying again."
        : "We could not sign you in right now. Please try again.",
    );
  }
}
