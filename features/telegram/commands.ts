/**
 * Text → action classification for the Telegram webhook. Pure functions,
 * no I/O — the webhook resolves the linked user and hands the intent on.
 */
export type TelegramIntent =
  | { kind: "start"; code: string | undefined }
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "capture"; text: string }
  | { kind: "help" };

const START_RE = /^\/start(?:\s+([a-f0-9]{64}))?$/i;

/** Everything the bot will do — anything else falls through to help. */
export function classifyTelegramText(text: string): TelegramIntent {
  const trimmed = text.trim();
  const start = START_RE.exec(trimmed);
  if (start) {
    return { kind: "start", code: start[1]?.toLowerCase() };
  }
  if (trimmed === "/today" || trimmed.toLowerCase() === "/today@mono_bot") {
    return { kind: "today" };
  }
  // General case: /command or /command@handle
  const command = /^\/([a-z][a-z0-9_-]*)(?:@[a-z0-9_]+)?(?:\s|$)/i.exec(trimmed);
  if (command) {
    const name = command[1].toLowerCase();
    if (name === "today") return { kind: "today" };
    if (name === "week") return { kind: "week" };
    if (name === "start") return classifyTelegramText("/start");
    return { kind: "help" };
  }
  if (trimmed.length > 0) {
    return { kind: "capture", text: trimmed };
  }
  return { kind: "help" };
}

export const TELEGRAM_HELP = [
  "Mono bot.",
  "",
  "/today — your three buckets and tick counts",
  "/week — your week, compiled",
  "or just send me a line and I'll save it to today's dot.",
  "",
  "Not connected yet? In the app: Settings → Telegram → Connect, then use the link it gives you.",
].join("\n");

export const TELEGRAM_NOT_LINKED = [
  "You're not connected to Mono yet.",
  "In the app: Settings → Telegram → Connect, then tap the link it gives you — it jumps straight here.",
].join("\n");
