// Timing probe for the AI suggest path (post-fix: lite first + structured output).
// Read-only: a few hundred tokens per call.
// Usage: node scripts/time-gemini.mjs
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) throw new Error("GEMINI_API_KEY missing in .env");

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const prompt = [
  "Suggest 2 tiny, cozy items for the midday block of a day. <= 40 chars each.",
  "Private, practical. Anchor each in the user's actions / timeline. Never repeat an existing item.",
  'Return ONLY a JSON array of 2 strings: ["...","..."]',
  "",
  "User's current actions:",
  "- read",
  "- exam prep",
  "Threads:",
  "Studying physics; Reading",
  "",
  "Already on the check:",
  "(empty)",
  "",
  "Recent entries:",
  "11-15: studied physics for an hour, felt good",
  "11-16: read 20 pages before bed",
].join("\n");

for (let attempt = 0; attempt < 3; attempt += 1) {
  const t0 = performance.now();
  const response = await fetch(`${ENDPOINT}/gemini-3.1-flash-lite:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: { type: "ARRAY", items: { type: "STRING" } },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const ms = Math.round(performance.now() - t0);
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  console.log(`attempt ${attempt + 1}: status ${response.status}  ${ms}ms  out: ${text?.slice(0, 80)}`);
}
