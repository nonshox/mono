import "server-only";

export type Bucket = "rise" | "midday" | "evening";

export type LocalSuggestInput = {
  bucket: Bucket;
  /** The user's stored actions (e.g. "read", "exam prep"). */
  actions: string[];
  /** Activity threads detected from recent entries (e.g. "Studying physics"). */
  threads: string[];
  /** Texts already on their check — never re-suggested. */
  timelineTexts: string[];
  /** ISO-ish day key (YYYY-MM-DD) so picks rotate day to day. */
  day: string;
};

const GERUND_PREFIX =
  /^(learning|studying|reading|working on|building|writing|practicing|memorizing|researching)\s+/i;

const cap = (value: string): string =>
  value.trim().replace(/^\p{L}/u, (letter) => letter.toUpperCase());

/** Small stable hash — rotates picks by day without any storage. */
const hash = (value: string): number => {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const COZY: Record<Bucket, string[]> = {
  rise: [
    "One glass of water",
    "Phone stays face down",
    "Three slow breaths",
    "Make the bed",
  ],
  midday: [
    "Lunch away from the screen",
    "Ten minute walk",
    "Ten quiet breaths",
    "One glass of water",
  ],
  evening: [
    "Phone in another room",
    "One line in the dot",
    "Five minutes of stillness",
    "Screen off 30 minutes early",
  ],
};

const TEMPLATES: Record<Bucket, Array<(anchor: string) => string>> = {
  rise: [
    (a) => `${cap(a)} for 10 minutes`,
    (a) => `${cap(a)} — one small start`,
    (a) => `Open ${a} for 5 minutes`,
  ],
  midday: [
    (a) => `${cap(a)} for 25 minutes`,
    (a) => `${cap(a)} — one small step`,
    (a) => `${cap(a)} before 3pm`,
  ],
  evening: [
    (a) => `${cap(a)} for 15 minutes`,
    (a) => `${cap(a)} — close the loop`,
    (a) => `${cap(a)} before dinner`,
  ],
};

const normalize = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const overlapsExisting = (item: string, existing: string[]): boolean => {
  const needle = normalize(item);
  return existing.some((text) => {
    const hay = normalize(text);
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
};

/**
 * Deterministic, offline — composed from what the writer is already doing.
 * Used when Gemini is down/slow, and as instant picks for the wand.
 */
export function localBucketSuggestions({
  bucket,
  actions,
  threads,
  timelineTexts,
  day,
}: LocalSuggestInput): string[] {
  const seen = new Set<string>();
  const anchors: string[] = [];

  for (const thread of threads) {
    const anchor = thread.replace(GERUND_PREFIX, "").trim().toLowerCase();
    if (anchor.length >= 3 && anchor.length <= 40 && !seen.has(anchor)) {
      seen.add(anchor);
      anchors.push(anchor);
    }
  }
  for (const action of actions) {
    const anchor = action.trim().toLowerCase();
    if (anchor.length >= 3 && anchor.length <= 40 && !seen.has(anchor)) {
      seen.add(anchor);
      anchors.push(anchor);
    }
  }

  const picks: string[] = [];
  if (anchors.length > 0) {
    const seed = hash(`${bucket}:${day}:${timelineTexts.length}`);
    const templates = TEMPLATES[bucket];
    for (let index = 0; index < anchors.length * templates.length && picks.length < 2; index += 1) {
      const anchor = anchors[(index * 5 + seed) % anchors.length];
      const template = templates[index % templates.length];
      const item = cap(template(anchor));
      if (item.length > 44) continue;
      if (picks.includes(item)) continue;
      if (overlapsExisting(item, timelineTexts)) continue;
      picks.push(item);
    }
  }

  for (const cozy of COZY[bucket]) {
    if (picks.length >= 2) break;
    if (overlapsExisting(cozy, timelineTexts)) continue;
    if (picks.includes(cozy)) continue;
    picks.push(cozy);
  }

  return picks.slice(0, 2);
}
