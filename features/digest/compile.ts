import { extractThemes } from "@/features/days/themes";
import { esc } from "@/lib/escape";

export type DigestEntry = { day: string; text: string; satisfied?: number | null };

const wordsOf = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

const sentencesOf = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const fmtDay = (day: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));

const themeLine = (themes: Array<{ label: string }>) =>
  themes.length > 0
    ? `themes · ${themes.slice(0, 4).map((theme) => esc(theme.label)).join(" · ")}`
    : null;

const satisfactionLine = (entries: DigestEntry[], label = "satisfaction") => {
  const rated = entries.flatMap((entry) =>
    entry.satisfied != null ? [entry.satisfied] : [],
  );
  if (rated.length === 0) return null;
  const avg = Math.round(rated.reduce((sum, value) => sum + value, 0) / rated.length);
  return `${label} · ${avg}% avg over ${rated.length} ${rated.length === 1 ? "day" : "days"}`;
};

/** Your week, compiled from what you actually wrote. Signed "Your week". */
export function compileLetter(entries: DigestEntry[]): string {
  if (entries.length === 0) {
    return "<b>Your week</b>\nempty — the dot will wait for you.\n\n<i>Your week</i>";
  }
  const totalWords = entries.reduce((sum, entry) => sum + wordsOf(entry.text), 0);
  const longest = [...entries].sort((a, b) => wordsOf(b.text) - wordsOf(a.text))[0];
  const themes = extractThemes(entries, 4);
  const bestLine = sentencesOf(
    [...entries].sort((a, b) => (b.satisfied ?? -1) - (a.satisfied ?? -1))[0]?.text ?? longest.text,
  )
    .filter((sentence) => wordsOf(sentence) >= 6)
    .sort((a, b) => wordsOf(b) - wordsOf(a))[0];

  const lines = [
    `<b>Your week</b> · ${entries.length} ${entries.length === 1 ? "day" : "days"} · ${totalWords} words`,
    `longest day · ${esc(fmtDay(longest.day))} · ${wordsOf(longest.text)} words`,
    themeLine(themes),
    satisfactionLine(entries),
    bestLine ? `<i>“${esc(bestLine)}”</i>` : null,
    "",
    "<i>Your week</i>",
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

/** Your year, compiled from what you actually wrote. Signed "Your year". */
export function compileYear(entries: DigestEntry[]): string {
  if (entries.length === 0) {
    return "<b>Your year</b>\nempty — every dot starts with a line.\n\n<i>Your year</i>";
  }
  const byMonth = new Map<string, DigestEntry[]>();
  for (const entry of entries) {
    const month = entry.day.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(entry);
    byMonth.set(month, bucket);
  }
  const totalWords = entries.reduce((sum, entry) => sum + wordsOf(entry.text), 0);
  const months = [...byMonth.entries()]
    .map(([month, monthEntries]) => {
      const rated = monthEntries.flatMap((entry) => (entry.satisfied != null ? [entry.satisfied] : []));
      const avg = rated.length
        ? Math.round(rated.reduce((sum, value) => sum + value, 0) / rated.length)
        : null;
      return { month, count: monthEntries.length, avg };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const best = [...months].filter((m) => m.avg !== null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
  const themes = extractThemes(entries, 4);

  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
      new Date(`${month}-01T00:00:00.000Z`),
    );

  const monthShape = months
    .map((month) =>
      month.avg !== null
        ? `${monthLabel(month.month)} ${month.avg}%`
        : `${monthLabel(month.month)} ${month.count} ${month.count === 1 ? "day" : "days"}`,
    )
    .join(" · ");

  const lines = [
    `<b>Your year</b> · ${entries.length} days · ${totalWords} words`,
    best ? `best stretch · ${monthLabel(best.month)} (${best.avg}%)` : null,
    `months · ${monthShape}`,
    themeLine(themes),
    satisfactionLine(entries),
    "",
    "<i>Your year</i>",
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

// Written for the 10:00pm moment — one short sentence, no exclamation marks,
// always about them, never about the app.
const NUDGE_BANK = [
  "The day's almost gone. What happened?",
  "Before tomorrow starts — one line for today.",
  "The day's closing. Stamp it with a few words.",
  "One line about today. That's all it takes.",
  "Nothing much happened? Write that instead.",
];

/**
 * One evening nudge grounded in recent themes; deterministic per day.
 * Returns a complete line — the fallback bank rotates by day-of-year.
 */
export function nudgeQuestionFor(entries: DigestEntry[], seed: number): string {
  const themes = extractThemes(entries, 1);
  if (themes[0]) {
    return `<i>${esc(themes[0].label)}</i> keeps coming up — how did today go?`;
  }
  return NUDGE_BANK[seed % NUDGE_BANK.length];
}

const FILLERS = /\b(u+m+|u+h+|erm+|err+|ah+)\b/gi;

/**
 * Local "polish" for raw dictation: strips filler words, fixes the lone "i",
 * collapses spaces, capitalizes sentence starts, ensures terminal punctuation.
 * Never adds, infers, or rewrites meaning.
 */
export function polishEntry(text: string): string {
  let out = text.replace(FILLERS, " ");
  out = out.replace(/\bi\b/g, "I");
  out = out.replace(/\s+([,.!?;:])/g, "$1");
  out = out.replace(/\s*\n\s*/g, " ");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix: string, char: string) =>
    prefix + char.toUpperCase(),
  );
  out = out.replace(/(,\s*){2,}/g, ", ").replace(/(\.\s*){2,}/g, ". ");
  out = out.trim();
  if (out && !/[.!?]"?$/.test(out)) {
    out += ".";
  }
  return out;
}
