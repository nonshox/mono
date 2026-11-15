import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  createBrainTask,
  deleteBrainTask,
  listBrainTasks,
  setBrainTaskDone,
} from "@/features/brain/service";
import {
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
} from "@/features/brain/schemas";
import { getUserRow } from "@/features/users/service";
import { splitTaskInput } from "@/features/ai/capture";

export async function GET() {
  const auth = await getAuthAccount("Brain lookup");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to see your brain.");
  }

  try {
    const tasks = await listBrainTasks(auth.account.$id);
    return NextResponse.json(
      { tasks },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Brain lookup", error);
    return jsonError(502, "BRAIN_UNAVAILABLE", "Your brain is unavailable right now.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Brain capture");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to capture thoughts.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Say something worth remembering.");
  }

  try {
    const row = await getUserRow(auth.account.$id);
    const parts = row?.ai
      ? await splitTaskInput(parsed.data.text)
      : [parsed.data.text];

    const created: Array<{ id: string; text: string; done: boolean }> = [];
    for (const part of parts) {
      created.push(await createBrainTask(auth.account.$id, part));
    }

    return NextResponse.json(
      { tasks: created },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logFailure("Brain capture", error);
    return jsonError(502, "CAPTURE_FAILED", "That thought could not be saved.");
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Brain toggle");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to check things off.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid task.");
  }

  try {
    const ok = await setBrainTaskDone(
      auth.account.$id,
      parsed.data.id,
      parsed.data.done,
    );
    if (!ok) {
      return jsonError(404, "TASK_NOT_FOUND", "That task does not exist.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Brain toggle", error);
    return jsonError(502, "TOGGLE_FAILED", "That task could not be updated.");
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("Brain delete");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to erase tasks.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = deleteTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Choose a valid task.");
  }

  try {
    const ok = await deleteBrainTask(auth.account.$id, parsed.data.id);
    if (!ok) {
      return jsonError(404, "TASK_NOT_FOUND", "That task does not exist.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFailure("Brain delete", error);
    return jsonError(502, "DELETE_FAILED", "That task could not be deleted.");
  }
}
