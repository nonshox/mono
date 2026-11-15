/**
 * Local, deterministic theme extraction — no AI, no network, no cost.
 * Tokenizes text into words, keeps content words (minus a stopword list),
 * counts unigrams + adjacent bigrams, returns the top recurring themes.
 */
import type { DayEntry } from "./client-api";

export type Theme = { label: string; count: number };

const STOPWORDS = new Set(
  [
    "about above after again against also among another around could do does doing down during each either enough even every few from further get getting give go goes gone going got has have having here how however into itself just keep later like make made many may maybe might more most mostly much must need neither never new next none nor now off often once one only onto other others otherwise out over own part perhaps put quite rather really right same seem seems several should show since some sometimes something soon still such sure take than that their them then there these they thing things think this those though through together told too under until upon used very want well what when where which while who whom whose why will with within without work would year years today yesterday tomorrow tonight morning evening night day days week month time times someone anyone nothing everything mind else back come came left change read write wrote writing feel feels felt look looked looking making made things way different sure great good bad better best nice hard fine big small little long short full part kind sort real actually finally almost always never ever often sometimes usually already again once twice another other person people",
    "january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday",
  ]
    .join(" ")
    .split(/\s+/),
);

const TOKEN = /\p{L}[\p{L}']*/gu;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN) ?? [])
    .map((raw) => raw.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

/** Top `limit` themes by frequency (bigrams preferred over their unigrams). */
export function extractThemes(
  entries: DayEntry[],
  limit = 4,
): Theme[] {
  const counts = new Map<string, number>();
  const bump = (label: string) =>
    counts.set(label, (counts.get(label) ?? 0) + 1);

  for (const entry of entries) {
    const tokens = tokenize(entry.text);
    for (const token of tokens) bump(token);
    for (let i = 0; i < tokens.length - 1; i += 1) {
      bump(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }

  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const themes: Theme[] = [];
  const claimedUnigrams = new Set<string>();

  for (const [label, count] of ranked) {
    if (themes.length >= limit) break;
    if (label.includes(" ")) {
      // Bigram wins — its two unigrams are implied by it.
      for (const part of label.split(" ")) claimedUnigrams.add(part);
      themes.push({ label, count });
      continue;
    }
    if (claimedUnigrams.has(label)) continue;
    themes.push({ label, count });
  }

  return themes;
}
