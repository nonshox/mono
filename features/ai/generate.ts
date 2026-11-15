import "server-only";

const DEFAULT_MODEL = "gemini-3.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export async function geminiGenerate(
  prompt: string,
  maxOutputTokens: number,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Gemini responded with ${response.status}.`);
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
  return text;
}

const entriesBlock = (entries: Array<{ day: string; text: string }>): string =>
  entries.map((entry) => `${entry.day}: ${entry.text}`).join("\n");

/** A short weekly letter from the past seven days, addressed to the writer. */
export async function generateWeeklyLetter(
  entries: Array<{ day: string; text: string }>,
): Promise<string> {
  if (entries.length === 0) {
    throw new Error("No entries to reflect on yet.");
  }
  return geminiGenerate(
    [
      "You write quiet letters home to the writer. Below are journal entries from the last 7 days.",
      "Write a letter from the week to its writer (second person). Two short paragraphs, under 130 words.",
      "Be specific — name what they actually wrote about. No advice, no therapy voice, no lists, no emoji.",
      'Warm but honest. Sign off with exactly "Your week".',
      "",
      entriesBlock(entries),
    ].join("\n"),
    700,
  );
}

/** One specific question for tonight's nudge, grounded in recent entries. */
export async function generateNudgeQuestion(
  entries: Array<{ day: string; text: string }>,
): Promise<string> {
  if (entries.length === 0) {
    return "";
  }
  const question = await geminiGenerate(
    [
      "Below are journal entries from recent days.",
      "Write ONE question (max 12 words) for an evening check-in asking how today went, grounded in what they wrote.",
      "Return ONLY the question — no preamble, no quotes, no punctuation beyond the question mark.",
      "",
      entriesBlock(entries),
    ].join("\n"),
    60,
  );
  return question.replace(/^[\s"']+|[\s"'.]+$/g, "").trim();
}

/** The year, compiled into one letter. */
export async function generateYearReview(
  entries: Array<{ day: string; text: string }>,
): Promise<string> {
  if (entries.length === 0) {
    throw new Error("Not enough days written to review yet.");
  }
  return geminiGenerate(
    [
      `Below is one year of journal entries (${entries.length} days). Compile the year into a letter:`,
      "Three short paragraphs, under 220 words. Open with the year's honest shape — up months, down months.",
      "Name what recurred (specific things they actually wrote about). Close with one sentence they'll want to keep.",
      "No flattery, no lists, no advice. Sign off with exactly \"Your year\".",
      "",
      entriesBlock(entries),
    ].join("\n"),
    800,
  );
}
