// TTFT / throughput probe — measures time-to-first-chunk and tokens/sec
// against the production model with the production call shape.
// Usage: node scripts/time-gemini-stream.mjs
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
if (!key) throw new Error("GEMINI_API_KEY missing in .env");

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse";

const prompt = [
  "Suggest 2 tiny, cozy items for the midday block of a day. <= 40 chars each.",
  "Anchor in what the user does: read, physics. Never repeat an existing item.",
  'Return only JSON: ["...","..."]',
].join("\n");

const t0 = performance.now();
const response = await fetch(ENDPOINT, {
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

let firstChunkAt = null;
let usage = null;
let text = "";
const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
if (!reader) throw new Error("no body");
let buffer = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += value.replace(/\r\n/g, "\n");
  const parts = buffer.split("\n\n");
  buffer = parts.pop() ?? "";
  for (const part of parts) {
    const line = part.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const json = line.slice(5).trim();
    if (json === "[DONE]") continue;
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    if (firstChunkAt === null && data?.candidates?.[0]) {
      firstChunkAt = performance.now() - t0;
    }
    text += data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (data?.usageMetadata) usage = data.usageMetadata;
  }
}
const total = performance.now() - t0;
const out = usage?.candidatesTokenCount ?? 0;
console.log(`status: ${response.status}`);
console.log(`time to first token: ${Math.round(firstChunkAt ?? -1)} ms`);
console.log(`total generation time: ${Math.round(total)} ms`);
console.log(`prompt tokens: ${usage?.promptTokenCount ?? "n/a"}, output tokens: ${out || "n/a"}`);
console.log(`tokens/sec (post-TTFT): ${firstChunkAt ? Math.round(out / ((total - firstChunkAt) / 1000)) : "n/a"}`);
console.log(`out: ${text.slice(0, 80)}`);
