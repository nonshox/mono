import "server-only";
import { geminiGenerate } from "@/features/ai/generate";

const COMPOUND = /(\band\b|\balso\b|\bthen\b|[;+&])/i;
const MIN_WORDS = 2;
const MAX_OUTPUT = 8; // never split one line into a wall of tasks

/**
 * Split one captured line into 1–8 atomic tasks. Cheap local heuristic for
 * simple lines (no AI); Gemini only when the line looks compound.
 */
export async function splitTaskInput(line: string): Promise<string[]> {
  const clean = line.replace(/\s+/g, " ").trim();
  if (!COMPOUND.test(clean)) return [clean];

  try {
    const raw = await geminiGenerate(
      [
        "Split this personal to-do capture into atomic, concrete tasks.",
        "Rules: keep the author's words and voice; no additions, no commentary, no numbering.",
        "If it is already a single task, return an array with just that one item.",
        "Return ONLY valid JSON, no fences — an array of short strings, two words minimum each.",
        "",
        clean,
      ].join("\n"),
      400,
    );
    const items = parseJsonArray(raw);
    const cleaned = items
      .map((text) => text.replace(/^[-•*]+\s*/g, "").replace(/^\d+[.)]\s*/g, "").trim())
      .filter((text) => text.length >= 3 && text.split(/\s+/).length >= MIN_WORDS)
      .slice(0, MAX_OUTPUT);
    return cleaned.length > 0 ? cleaned : [clean];
  } catch {
    return [clean];
  }
}

function parseJsonArray(raw: string): string[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array returned.");
  const data = JSON.parse(raw.slice(start, end + 1)) as unknown[];
  return data.filter((entry): entry is string => typeof entry === "string");
}
