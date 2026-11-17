import "server-only";

import { stem, STOP, tokenize } from "@/features/ai/nlp";
import type { DayEntry } from "@/features/days/service";

// Stems as produced by natural's PorterStemmer — not truncations.
const ACTIVITY_STEMS = new Set([
  "learn",
  "studi",
  "read",
  "write",
  "wrote",
  "written",
  "practic",
  "practis",
  "memor",
  "research",
  "work",
  "build",
  "creat",
  "edit",
  "record",
  "plai",
  "danc",
  "travel",
  "hike",
  "swim",
  "walk",
  "run",
  "cook",
  "paint",
  "speak",
  "start",
  "plan",
  "code",
  "design",
  "ship",
  "launch",
  "collect",
  "gather",
  "appli",
  "develop",
  "finish",
  "fix",
  "repair",
  "watch",
  "listen",
  "prepar",
  "train",
  "exercis",
  "medit",
  "review",
  "revis",
  "clean",
  "workout",
  "cycl",
]);

// Filler after any verb — never a topic. Raw lowercase words, matched
// against raw tokens. (ACTIVITY_STEMS is the only stemmed comparison.)
const OBJECT_STOP = new Set([
  ...STOP,
  "nook",
  "outside",
  "inside",
  "today",
  "recently",
  "usually",
  "normally",
  "sometimes",
  "ever",
  "soon",
  "again",
  "always",
  "never",
  "one",
  "two",
  "three",
  "page",
  "pages",
  "book",
  "books",
  "chapter",
  "chapters",
  "thing",
  "things",
  "stuff",
  "item",
  "items",
  "place",
  "corner",
  "spot",
  "home",
  "room",
  "desk",
  "chair",
  "phone",
  "computer",
  "screen",
  "wall",
  "floor",
  "door",
  "window",
  "light",
  "water",
  "coffee",
  "tea",
  "snack",
  "minute",
  "minutes",
  "hour",
  "hours",
]);

export type ActionCandidate = { phrase: string; weight: number };

const isFillerPhrase = (phrase: string): boolean => {
  const parts = phrase.split(/\s+/);
  return parts.every((part) => OBJECT_STOP.has(part));
};

/**
 * Real topics matter more than the verb that led there.
 * Noun(s) after an activity verb become a candidate; the more entries a
 * phrase appears in, the higher it ranks. Single-mention phrases are kept —
 * with a 10-day window they are often exactly what's new.
 */
export function detectActions(
  entries: DayEntry[],
  limit = 12,
): ActionCandidate[] {
  const freq = new Map<string, number>();

  for (const entry of entries) {
    const raw = tokenize(entry.text);
    const stems = raw.map(stem);
    const entryCandidates = new Set<string>();

    for (let index = 0; index < stems.length - 1; index += 1) {
      if (!ACTIVITY_STEMS.has(stems[index])) continue;
      const after = raw.slice(index + 1, index + 4);
      const nouns: string[] = [];
      for (const token of after) {
        if (nouns.length >= 2) break;
        if (OBJECT_STOP.has(token)) continue;
        if (token.length < 3) continue;
        nouns.push(token);
      }
      if (nouns.length === 0) continue;

      const phrase = nouns.join(" ").toLowerCase();
      if (isFillerPhrase(phrase)) continue;

      entryCandidates.add(phrase);
    }

    for (const phrase of entryCandidates) {
      freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
    }
  }

  const scored = [...freq.entries()]
    .map(([phrase, weight]) => ({ phrase, weight }))
    .sort((a, b) => b.weight - a.weight || a.phrase.localeCompare(b.phrase));

  const pool = scored;
  return pool.slice(0, limit);
}
