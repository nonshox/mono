import "server-only";

import { stem, STOP, tokenize } from "@/features/ai/nlp";
import {
  localBucketSuggestions,
  type Bucket,
} from "@/features/ai/local-suggest";
import type { DayEntry } from "@/features/days/service";

export type SuggestSource = "ai" | "local";

type BucketPicks = { rise: string[]; midday: string[]; evening: string[] };

// Measured 2026-11 — the user's key has zero quota on the preview models
// (instant 429) and 2.5-flash was retired (404). Lite is the fast, quota-clean
// path; heavier models stay only as rescues when lite itself fails.
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
];

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// Hard ~5s guarantee for the wand tap: each attempt is capped by the time
// left in the budget, so no hanging model can stretch the tap past ~5s.
// After that we serve local picks instantly instead of erroring.
const TOTAL_BUDGET_MS = 5_000;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/* ------------------------------------------------------------------ */
/* NLP — read what the writer is actually doing, no AI yet.            */
/* ------------------------------------------------------------------ */

const ACTIVITY_STEMS: Array<{ stem: string; phrase: (object: string) => string }> = [
  { stem: "learn", phrase: (o) => `Learning ${o}` },
  { stem: "studi", phrase: (o) => `Studying ${o}` },
  { stem: "read", phrase: (o) => `Reading ${o}` },
  { stem: "work", phrase: (o) => `Working on ${o}` },
  { stem: "build", phrase: (o) => `Building ${o}` },
  { stem: "writ", phrase: (o) => `Writing ${o}` },
  { stem: "practic", phrase: (o) => `Practicing ${o}` },
  { stem: "memor", phrase: (o) => `Memorizing ${o}` },
  { stem: "resea", phrase: (o) => `Researching ${o}` },
  { stem: "research", phrase: (o) => `Researching ${o}` },
];

const trimObject = (tokens: string[]): string =>
  tokens
    .filter((token) => !STOP.has(stem(token)) && token.length >= 4)
    .slice(0, 2)
    .join(" ")
    .trim();

export type Threads = {
  entries: number;
  activities: string[];
  sparse: boolean;
};

/** What threads the writer keeps picking at — from their own entries only. */
export function detectThreads(entries: DayEntry[]): Threads {
  const counts = new Map<string, number>();

  for (const entry of entries.slice(-30)) {
    const tokens = tokenize(entry.text);
    const stems = tokens.map(stem);
    for (let index = 0; index < stems.length - 1; index += 1) {
      for (const activity of ACTIVITY_STEMS) {
        if (stems[index] !== activity.stem) continue;
        const object = trimObject(tokens.slice(index + 1, index + 3));
        if (!object) continue;
        const phrase = activity.phrase(object);
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }

  const activities = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([phrase]) => phrase);

  return {
    entries: entries.length,
    activities,
    sparse: entries.length < 5 && activities.length === 0,
  };
}

/* ------------------------------------------------------------------ */
/* Gemini — called once per suggestion.                                  */
/* ------------------------------------------------------------------ */

const sanitize = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0 && entry.length <= 80)
        .slice(0, 5)
    : [];

const parsePicks = (raw: string): BucketPicks => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { rise: [], midday: [], evening: [] };
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      rise: sanitize(parsed.rise),
      midday: sanitize(parsed.midday),
      evening: sanitize(parsed.evening),
    };
  } catch {
    return { rise: [], midday: [], evening: [] };
  }
};

/** Structured-output constraint — the model emits only JSON, no preamble. */
export type SuggestSchema =
  | { type: "ARRAY"; items: { type: "STRING" } }
  | {
      type: "OBJECT";
      properties: Record<string, { type: "ARRAY"; items: { type: "STRING" } }>;
      required: string[];
    };

const STRING_ARRAY = { type: "ARRAY", items: { type: "STRING" } } as const;

export const SUGGEST_ARRAY_SCHEMA: SuggestSchema = STRING_ARRAY;

export const SUGGEST_DAY_SCHEMA: SuggestSchema = {
  type: "OBJECT",
  properties: { rise: STRING_ARRAY, midday: STRING_ARRAY, evening: STRING_ARRAY },
  required: ["rise", "midday", "evening"],
};

async function fetchModel(
  model: string,
  prompt: string,
  maxOutputTokens: number,
  schema: SuggestSchema | undefined,
  key: string,
  timeoutMs: number,
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens,
        temperature: 0.8,
        // Thinking models burn the budget on invisible reasoning, which
        // truncates the JSON before it closes. Turn thinking off.
        thinkingConfig: { thinkingBudget: 0 },
        ...(schema
          ? {
              responseMimeType: "application/json",
              responseSchema: schema,
            }
          : {}),
      },
    }),
    signal: AbortSignal.timeout(Math.max(500, timeoutMs)),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const data = (await response.json()) as GeminiResponse;
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return { ok: true, text };
}

async function callGemini(
  prompt: string,
  maxOutputTokens: number,
  schema?: SuggestSchema,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const configured = process.env.GEMINI_MODEL?.trim();
  const candidates = configured
    ? [configured, ...FALLBACK_MODELS.filter((m) => m !== configured)]
    : FALLBACK_MODELS;

  let lastStatus = 0;
  const started = Date.now();
  const remaining = () => TOTAL_BUDGET_MS - (Date.now() - started);
  for (const model of candidates) {
    const budget = remaining();
    if (budget <= 500) break; // hard ~5s cap — serve local, never hang
    try {
      let result = await fetchModel(model, prompt, maxOutputTokens, schema, key, budget);
      if (!result.ok && result.status === 400 && schema) {
        // Schema rejected — downgrade to unstructured JSON for this model.
        const downgradeBudget = remaining();
        if (downgradeBudget > 500) {
          result = await fetchModel(model, prompt, maxOutputTokens, undefined, key, downgradeBudget);
        }
      }
      if (result.ok) {
        noteGeminiSuccess();
        return result.text;
      }
      lastStatus = result.status;
      // 4xx is usually fatal (model missing / quota), 5xx worth retrying down the list.
      const retryable = result.status === 404 || result.status === 429 || result.status >= 500;
      if (!retryable) break;
    } catch {
      lastStatus = 503;
      continue;
    }
  }
  throw new Error(`Gemini unavailable (last status ${lastStatus}).`);
}

const personalPrompt = (
  entries: DayEntry[],
  threads: Threads,
  userActions: string[],
  timelineTexts: string[],
): string =>
  [
    "You are a gentle, plain-spoken productivity assistant who knows this writer.",
    "Suggest a tiny, cozy check for ONE day. 2-3 items per bucket, ≤ 44 chars each.",
    "Anchor every item in what the user is already doing. Never repeat an item already on their check.",
    "Return ONLY valid JSON:",
    '{"rise":["..."],"midday":["..."],"evening":["..."]}',
    "",
    "User's current actions:",
    userActions.length > 0 ? userActions.map((a) => `- ${a}`).join("\n") : "(none set)",
    "Threads:",
    threads.activities.length > 0 ? threads.activities.join("; ") : "(none clear)",
    "",
    "Already on the check:",
    timelineTexts.length > 0 ? timelineTexts.slice(0, 30).map((t) => `- ${t}`).join("\n") : "(empty)",
    "",
    "Recent entries:",
    entries
      .slice(-10)
      .map((entry) => `${entry.day.slice(5)}: ${entry.text.slice(0, 120)}`)
      .join("\n"),
  ].join("\n");

const bucketPrompt = (
  bucket: "rise" | "midday" | "evening",
  entries: DayEntry[],
  threads: Threads,
  userActions: string[],
  timelineTexts: string[],
): string =>
  [
    `Suggest 2 tiny, cozy items for the ${bucket} block of a day. ≤ 40 chars each.`,
    "Private, practical. Anchor each in the user's actions / timeline. Never repeat an existing item.",
    "Return ONLY a JSON array of 2 strings: [\"...\",\"...\"]",
    "",
    "User's current actions:",
    userActions.length > 0 ? userActions.map((a) => `- ${a}`).join("\n") : "(none set)",
    "Threads:",
    threads.activities.length > 0 ? threads.activities.join("; ") : "(none clear)",
    "",
    "Already on the check:",
    timelineTexts.length > 0 ? timelineTexts.slice(0, 30).map((t) => `- ${t}`).join("\n") : "(empty)",
    "",
    "Recent entries:",
    entries
      .slice(-10)
      .map((entry) => `${entry.day.slice(5)}: ${entry.text.slice(0, 120)}`)
      .join("\n"),
  ].join("\n");

const habitsPrompt = (): string =>
  [
    "Suggest a tiny, cozy daily check in the habits-literature spirit.",
    "3 items per bucket, ≤ 44 chars. Practical: water, light, pages, stillness.",
    "Return ONLY valid JSON:",
    '{"rise":["..."],"midday":["..."],"evening":["..."]}',
  ].join("\n");

/** Extract up to 3 items from Gemini's JSON array response; null if unusable. */
function parseBucketItems(raw: string): string[] | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0 && item.length <= 44)
      .slice(0, 3);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

// --- Circuit breaker ---------------------------------------------------------
// Gemini free-tier answers in waves; when it's down, walking the fallback
// chain on every tap just burns the user's time. Trip the circuit for two
// minutes, then probe once again — the tap always gets a useful answer.

let geminiDownUntil = 0;
const CIRCUIT_COOLDOWN_MS = 120_000;
const circuitOpen = () => Date.now() < geminiDownUntil;
const tripCircuit = () => {
  geminiDownUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
};
const noteGeminiSuccess = () => {
  geminiDownUntil = 0;
};

const localFor = (
  bucket: Bucket,
  threads: Threads,
  userActions: string[],
  timelineTexts: string[],
): { items: string[]; source: SuggestSource } => ({
  items: localBucketSuggestions({
    bucket,
    actions: userActions,
    threads: threads.activities,
    timelineTexts,
    day: new Date().toISOString().slice(0, 10),
  }),
  source: "local",
});

export async function suggestBucket(
  bucket: Bucket,
  entries: DayEntry[],
  userActions: string[] = [],
  timelineTexts: string[] = [],
): Promise<{ items: string[]; source: SuggestSource }> {
  const threads = detectThreads(entries);
  if (!circuitOpen()) {
    try {
      const prompt = bucketPrompt(bucket, entries, threads, userActions, timelineTexts);
      const raw = await callGemini(prompt, 120, SUGGEST_ARRAY_SCHEMA);
      const items = parseBucketItems(raw);
      if (items) {
        return { items, source: "ai" };
      }
      // Answered with garbage — serve local rather than static filler.
    } catch {
      tripCircuit();
    }
  }
  return localFor(bucket, threads, userActions, timelineTexts);
}

export async function suggestDay(
  entries: DayEntry[],
  userActions: string[] = [],
  timelineTexts: string[] = [],
): Promise<{ picks: BucketPicks; source: SuggestSource }> {
  const threads = detectThreads(entries);
  if (!circuitOpen()) {
    try {
      const prompt = threads.sparse
        ? habitsPrompt()
        : personalPrompt(entries, threads, userActions, timelineTexts);
      const raw = await callGemini(prompt, 200, SUGGEST_DAY_SCHEMA);
      const picks = parsePicks(raw);
      if (picks.rise.length + picks.midday.length + picks.evening.length > 0) {
        return { picks, source: "ai" };
      }
    } catch {
      tripCircuit();
    }
  }
  return {
    picks: {
      rise: localFor("rise", threads, userActions, timelineTexts).items,
      midday: localFor("midday", threads, userActions, timelineTexts).items,
      evening: localFor("evening", threads, userActions, timelineTexts).items,
    },
    source: "local",
  };
}
