import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { listAllEntries } from "@/features/days/service";
import { compileYear } from "@/features/digest/compile";

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

  try {
    const year = new Date().getUTCFullYear();
    const entries = await listAllEntries(auth.account.$id);
    const yearEntries = entries.filter((entry) =>
      entry.day.startsWith(String(year)),
    );
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
