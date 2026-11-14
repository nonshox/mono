import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import { deleteUserEverywhere } from "@/features/users/service";

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Account deletion");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to delete your account.");
  }

  try {
    await deleteUserEverywhere(auth.account.$id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logFailure("Account deletion", error);
    return jsonError(502, "ACCOUNT_DELETE_FAILED", "Your account could not be deleted. Please try again.");
  }
}
