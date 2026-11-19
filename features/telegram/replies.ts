import "server-only";

import { compileLetter } from "@/features/digest/compile";
import {
  listRecentEntries,
  appendToDay,
} from "@/features/days/service";
import { esc } from "@/lib/escape";
import { listTimeline } from "@/features/check/service";
import { userDay } from "@/lib/dates";
import { getUserRow } from "@/features/users/service";
import { BUCKETS } from "@/features/check/types";
import type { TimelineItem } from "@/features/check/types";

const BUCKET_HEADING: Record<string, string> = {
  rise: "Rise",
  midday: "Midday",
  evening: "Evening",
};

/** Format the check buckets for Telegram. */
export function formatCheck(items: TimelineItem[]): string {
  const lines: string[] = [];
  let doneTotal = 0;
  for (const bucket of BUCKETS) {
    const bucketItems = items
      .filter((item) => item.bucket === bucket)
      .sort((a, b) => a.order - b.order);
    const done = bucketItems.filter((item) => item.done).length;
    doneTotal += done;
    if (bucketItems.length > 0) {
      lines.push(`<b>${BUCKET_HEADING[bucket]} · ${done}/${bucketItems.length}</b>`);
      for (const item of bucketItems) {
        lines.push(`${item.done ? "✓" : "○"} ${esc(item.text)}`);
      }
      if (bucket !== BUCKETS[BUCKETS.length - 1]) lines.push("");
    }
  }
  lines.push("");
  lines.push(`<i>${doneTotal}/${items.length} done</i>`);
  return lines.join("\n");
}

export async function replyCheck(
  origin: string,
  send: (chatId: string, text: string, buttons: Array<{ text: string; webApp: string }>) => Promise<void>,
  chatId: string,
  userId: string,
): Promise<void> {
  const items = await listTimeline(userId);
  const text =
    items.length === 0 ? "Nothing on the check yet." : formatCheck(items);
  await send(chatId, text, [{ text: "Open Mono", webApp: `${origin}/check` }]);
}

export async function replyWeek(
  origin: string,
  send: (chatId: string, text: string, buttons: Array<{ text: string; webApp: string }>) => Promise<void>,
  chatId: string,
  userId: string,
): Promise<void> {
  const user = await getUserRow(userId).catch(() => null);
  const timeZone = user?.tz ?? null;
  const weekAgo = userDay(timeZone, new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const entries = (await listRecentEntries(userId, 30, timeZone)).filter(
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
  const user = await getUserRow(userId).catch(() => null);
  const today = userDay(user?.tz ?? null);
  try {
    await appendToDay(userId, today, text);
    const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    await send(
      chatId,
      `<b>Saved</b> · ${esc(preview)}`,
      [{ text: "Open Mono", webApp: `${origin}/` }],
    );
  } catch {
    await send(chatId, "<b>Today is full</b>\n1000 characters — edit in the app.", []);
  }
}
