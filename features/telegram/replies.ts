import "server-only";

import { compileLetter } from "@/features/digest/compile";
import {
  listRecentEntries,
  appendToDay,
} from "@/features/days/service";
import { listTimeline } from "@/features/today/service";
import { BUCKETS } from "@/features/today/types";
import type { TimelineItem } from "@/features/today/types";

const BUCKET_HEADING: Record<string, string> = {
  rise: "Rise",
  midday: "Midday",
  evening: "Evening",
};

/** Format today's buckets for Telegram. Pure — unit-testable shape in/out. */
export function formatToday(items: TimelineItem[]): string {
  const lines: string[] = [];
  let doneTotal = 0;
  for (const bucket of BUCKETS) {
    const bucketItems = items
      .filter((item) => item.bucket === bucket)
      .sort((a, b) => a.order - b.order);
    const done = bucketItems.filter((item) => item.done).length;
    doneTotal += done;
    lines.push(`${BUCKET_HEADING[bucket]} — ${done}/${bucketItems.length}`);
    for (const item of bucketItems) {
      lines.push(`${item.done ? "✓" : "○"} ${item.text}`);
    }
  }
  lines.push("");
  lines.push(`${doneTotal}/${items.length} today`);
  return lines.join("\n");
}

export async function replyToday(
  origin: string,
  send: (chatId: string, text: string, buttons: Array<{ text: string; webApp: string }>) => Promise<void>,
  chatId: string,
  userId: string,
): Promise<void> {
  const items = await listTimeline(userId);
  const text = items.length === 0 ? "Nothing planned today yet." : formatToday(items);
  await send(chatId, text, [{ text: "Open Mono", webApp: `${origin}/today` }]);
}

export async function replyWeek(
  origin: string,
  send: (chatId: string, text: string, buttons: Array<{ text: string; webApp: string }>) => Promise<void>,
  chatId: string,
  userId: string,
): Promise<void> {
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const entries = (await listRecentEntries(userId, 30)).filter(
    (entry) => entry.day >= weekAgo,
  );
  if (entries.length === 0) {
    await send(chatId, "Nothing written this week yet — even three words count.", [
      { text: "Open Mono", webApp: `${origin}/` },
    ]);
    return;
  }
  await send(chatId, compileLetter(entries), [
    { text: "Open Mono", webApp: `${origin}/journal` },
  ]);
}

export async function replyCapture(
  origin: string,
  send: (chatId: string, text: string, buttons: Array<{ text: string; webApp: string }>) => Promise<void>,
  chatId: string,
  userId: string,
  text: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    await appendToDay(userId, today, text);
    await send(
      chatId,
      `Saved today: “${text.length > 80 ? `${text.slice(0, 80)}…` : text}”`,
      [{ text: "Open Mono", webApp: `${origin}/` }],
    );
  } catch {
    await send(chatId, "Today's entry is full — open Mono to edit it.", []);
  }
}
