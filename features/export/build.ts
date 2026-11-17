/**
 * Pure export builders — no I/O, no dates read from the clock beyond what
 * callers pass in. JSON is the lossless backup; Markdown is for reading/printing.
 */
export type ExportProfile = { name: string; email: string };

export type ExportDay = { day: string; text: string; satisfied?: number | null };

export type ExportItem = { bucket: string; text: string; order: number; done: boolean };

export type ExportPayload = {
  format: "mono/1";
  exportedAt: string;
  profile: ExportProfile;
  days: ExportDay[];
  timeline: ExportItem[];
};

const BUCKET_ORDER = ["rise", "midday", "evening"] as const;
const bucketRank = (bucket: string) => {
  const index = BUCKET_ORDER.indexOf(bucket as (typeof BUCKET_ORDER)[number]);
  return index === -1 ? BUCKET_ORDER.length : index;
};

export function buildPayload(input: {
  exportedAt: string;
  profile: ExportProfile;
  days: ExportDay[];
  timeline: ExportItem[];
}): ExportPayload {
  return {
    format: "mono/1",
    exportedAt: input.exportedAt,
    profile: input.profile,
    days: [...input.days].sort((a, b) => a.day.localeCompare(b.day)),
    timeline: [...input.timeline].sort((a, b) => {
      const bucket = bucketRank(a.bucket) - bucketRank(b.bucket);
      if (bucket !== 0) return bucket;
      return a.order - b.order;
    }),
  };
}

const BUCKET_HEADING: Record<string, string> = {
  rise: "Rise",
  midday: "Midday",
  evening: "Evening",
};

function lineOf(day: ExportDay): string {
  return day.satisfied != null ? `## ${day.day} · ${day.satisfied}%` : `## ${day.day}`;
}

/** A single Markdown document with profile, timeline and the full journal. */
export function buildMarkdown(payload: ExportPayload): string {
  const { profile, days, timeline, exportedAt } = payload;
  const parts: string[] = [];

  parts.push("# Mono export");
  parts.push(`Exported: ${exportedAt}`);
  if (profile.name) parts.push(`Name: ${profile.name}`);
  parts.push(`Email: ${profile.email}`);
  parts.push("");

  parts.push("---");
  parts.push("");
  parts.push("# Today");
  parts.push("");
  for (const bucket of BUCKET_ORDER) {
    const items = timeline.filter((item) => item.bucket === bucket);
    if (items.length === 0) continue;
    parts.push(`## ${BUCKET_HEADING[bucket]}`);
    for (const item of items) {
      parts.push(`- [${item.done ? "x" : " "}] ${item.text}`);
    }
    parts.push("");
  }

  parts.push("---");
  parts.push("");
  parts.push("# Journal");
  parts.push("");
  if (days.length === 0) {
    parts.push("_Nothing written yet._");
    parts.push("");
  } else {
    for (const day of days) {
      parts.push(lineOf(day));
      parts.push(day.text);
      parts.push("");
    }
  }

  return parts.join("\n");
}
