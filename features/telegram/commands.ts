/**
 * Text → action classification for the Telegram webhook. Pure functions,
 * no I/O — the webhook resolves the linked user and hands the intent on.
 */
export type TelegramIntent =
  | { kind: "start"; code: string | undefined }
  | { kind: "check" }
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
  if (trimmed === "/check" || trimmed.toLowerCase() === "/check@mono_bot") {
    return { kind: "check" };
  }
  if (trimmed === "/today" || trimmed.toLowerCase() === "/today@mono_bot") {
    return { kind: "check" }; // legacy alias
  }
  if (trimmed === "/checklist" || trimmed.toLowerCase() === "/checklist@mono_bot") {
    return { kind: "check" }; // legacy alias
  }
  // General case: /command or /command@handle
  const command = /^\/([a-z][a-z0-9_-]*)(?:@[a-z0-9_]+)?(?:\s|$)/i.exec(trimmed);
  if (command) {
    const name = command[1].toLowerCase();
    if (name === "check") return { kind: "check" };
    if (name === "today") return { kind: "check" }; // legacy alias
    if (name === "checklist") return { kind: "check" }; // legacy alias
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
  "<b>Mono</b>",
  "<i>/check</i> — your three blocks",
  "<i>/week</i> — your week, your words",
  "or just send a line → saves to today",
].join("\n");

export const TELEGRAM_NOT_LINKED = [
  "<b>Not connected</b>",
  "In the app: Settings → Telegram → Connect",
].join("\n");
