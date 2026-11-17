import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { listYearEntries } from "@/features/days/service";
import { compileYear } from "@/features/digest/compile";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Year review");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to review your year.");
  }

  const limited = rateLimit("ai:review", auth.account.$id, 20, 60_000);
  if (!limited.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Slowing down — try again in ${limited.retryAfterSeconds}s.`,
    );
  }

  try {
    const year = new Date().getUTCFullYear();
    const yearEntries = await listYearEntries(auth.account.$id, year);
    if (yearEntries.length < 10) {
      return jsonError(
        400,
        "NOT_ENOUGH_WRITTEN",
        "Write a handful more days before this one means something.",
      );
    }

    const review = compileYear(yearEntries);
    return NextResponse.json({ year, review });
  } catch (error) {
    logFailure("Year review", error);
    return jsonError(
      502,
      "REVIEW_UNAVAILABLE",
      "Your year could not be compiled right now.",
    );
  }
}
