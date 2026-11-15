import "server-only";
import { geminiGenerate } from "@/features/ai/generate";

export type TidyResult = {
  drops: string[];
  rewrites: Array<{ id: string; text: string }>;
};

/**
 * Ask Gemini to deduplicate and tighten an open-task list. Returns small
 * structured instructions: which rows to delete, and which texts to rewrite.
 * Keeps your voice — no additions, no reinterpretation.
 */
export async function tidyTaskList(
  tasks: Array<{ id: string; text: string }>,
): Promise<TidyResult> {
  const listing = tasks
    .map((task) => `${task.id} :: ${task.text.slice(0, 120)}`)
    .join("\n");

  const raw = await geminiGenerate(
    [
      "You tidy a personal to-do list. Below are open items, one per line, in the form `id :: text`.",
      "Rules:",
      "1. Remove near-duplicates (same thing said twice). Keep the clearer one, mark the other for deletion.",
      "2. Rewrite ONLY the items that are unclear, run-on, or overly long — keep the author's words, voice and language. Do not add anything. Do not remove meaning.",
      "3. Never invent facts. Never merge items that are actually different.",
      "4. Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:",
      '{"drops":["id1","id2"],"rewrites":[{"id":"id3","text":"cleaner text"}]}',
      "Use empty arrays when nothing applies. Keep at most 60 items total in any output.",
      "",
      listing,
    ].join("\n"),
    1500,
  );

  const parsed = parseTidyJson(raw);
  const ids = new Set(tasks.map((task) => task.id));
  return {
    drops: parsed.drops.filter((id) => ids.has(id)),
    rewrites: parsed.rewrites.filter((item) => ids.has(item.id)),
  };
}

function parseTidyJson(raw: string): {
  drops: string[];
  rewrites: Array<{ id: string; text: string }>;
} {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Tidy returned no JSON object.");
  }
  const data = JSON.parse(raw.slice(start, end + 1)) as {
    drops?: unknown;
    rewrites?: unknown;
  };
  const drops = Array.isArray(data.drops)
    ? data.drops.filter((id): id is string => typeof id === "string")
    : [];
  const rewrites = Array.isArray(data.rewrites)
    ? data.rewrites.flatMap((entry) => {
        if (
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { id?: unknown }).id === "string" &&
          typeof (entry as { text?: unknown }).text === "string"
        ) {
          const { id, text } = entry as { id: string; text: string };
          const trimmed = text.trim().slice(0, 300);
          return trimmed ? [{ id, text: trimmed }] : [];
        }
        return [];
      })
    : [];
  return { drops, rewrites };
}
