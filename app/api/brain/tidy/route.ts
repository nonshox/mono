import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  deleteBrainTask,
  listBrainTasks,
  listOpenBrainTasks,
  setBrainTaskText,
} from "@/features/brain/service";
import { getUserRow } from "@/features/users/service";
import { tidyTaskList } from "@/features/ai/tidy";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Brain tidy");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to tidy your brain.");
  }

  try {
    const row = await getUserRow(auth.account.$id);
    if (!row?.ai) {
      return jsonError(403, "AI_NOT_ENABLED", "Enable Mono AI in Settings first.");
    }

    const open = await listOpenBrainTasks(auth.account.$id);
    if (open.length < 2) {
      return jsonError(400, "NOT_ENOUGH_TASKS", "Add a few thoughts first.");
    }

    const tidy = await tidyTaskList(open);

    // Apply deletions first, then rewrites — order doesn't conflict.
    for (const id of tidy.drops) {
      await deleteBrainTask(auth.account.$id, id).catch((error) =>
        logFailure("Brain tidy delete", error),
      );
    }
    for (const item of tidy.rewrites) {
      await setBrainTaskText(auth.account.$id, item.id, item.text).catch(
        (error) => logFailure("Brain tidy rewrite", error),
      );
    }

    const tasks = await listBrainTasks(auth.account.$id);
    return NextResponse.json(
      { tasks },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Brain tidy", error);
    return jsonError(502, "TIDY_UNAVAILABLE", "Tidy could not run right now.");
  }
}
