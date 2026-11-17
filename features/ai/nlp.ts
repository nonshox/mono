import "server-only";

import natural from "natural";

const { PorterStemmer } = natural;

export const stem = (word: string) => PorterStemmer.stem(word);

export const TOKEN = /\p{L}[\p{L}']*/gu;

export const STOP = new Set(
  [
    "about above after again against also among another around could do does doing down during each either enough even every few from further get getting give go goes gone going got has have having here how however into itself just keep later like make made many may maybe might more most mostly much must need neither never new next none nor now off often once one only onto other others otherwise out over own part perhaps put quite rather really right same seem seems several should show since some sometimes something soon still such sure take than that their them then there these they thing things think this those though through together told too under until upon used very want well what when where which while who whom whose why will with within without work would year years today yesterday tomorrow tonight morning evening night day days week month time times someone anyone nothing everything mind else back come came left change read write wrote writing feel feels felt look looked looking making made way different great good bad better best nice hard fine big small little long short full part kind sort real actually finally almost always never ever often sometimes usually already again once twice another other person people",
    "january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday",
    "the and but for not yet last early earlier morning mornings night studied written study studies reading writing",
  ]
    .join(" ")
    .split(/\s+/),
);

export const tokenize = (text: string): string[] =>
  (text.toLowerCase().match(TOKEN) ?? [])
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length >= 3);

/** Tokens stemmed and windows of 2 consecutive for phrase extraction. */
export const tokenizePairs = (text: string): Array<[string, string, string]> => {
  const raw = tokenize(text);
  const result: Array<[string, string, string]> = [];
  for (let index = 0; index < raw.length - 1; index += 1) {
    result.push([stem(raw[index]), stem(raw[index + 1]), raw[index]]);
  }
  return result;
};
