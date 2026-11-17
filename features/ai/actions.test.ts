import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { detectActions } from "./actions";
import type { DayEntry } from "@/features/days/service";

const entry = (text: string, day = "2026-11-10"): DayEntry => ({
  day,
  text,
  satisfied: null,
});

describe("detectActions", () => {
  it("recognizes writing verbs — the write family stems to write/wrote/written", () => {
    const found = detectActions([
      entry("wrote about mono for an hour", "2026-11-10"),
      entry("writing mono docs again", "2026-11-11"),
    ]);
    const phrases = found.map((candidate) => candidate.phrase);
    expect(phrases).toContain("mono");
  });

  it("skips leading stopwords after a verb — 'read the physics' → physics", () => {
    const found = detectActions([entry("read the physics again")]);
    expect(found.map((c) => c.phrase)).toContain("physics");
    expect(found.map((c) => c.phrase).some((p) => p.startsWith("the"))).toBe(false);
  });

  it("joins two nouns — 'and' is a stopword too", () => {
    const found = detectActions([entry("studying physics and math")]);
    const phrases = found.map((c) => c.phrase);
    expect(phrases.some((p) => p.includes("and"))).toBe(false);
  });

  it("recognizes newly covered verbs — fix, finish, watch, prepare", () => {
    const found = detectActions([
      entry("fixed the bicycle chain today", "2026-11-10"),
      entry("finished the budget report", "2026-11-11"),
      entry("watched the finale last night", "2026-11-12"),
      entry("prepared the taxes early", "2026-11-13"),
    ]);
    const phrases = found.map((c) => c.phrase);
    expect(phrases).toContain("bicycle chain");
    expect(phrases).toContain("budget report");
    expect(phrases).toContain("finale");
    expect(phrases).toContain("taxes");
  });

  it("counts frequency across entries — repeated topics outrank one-offs", () => {
    const found = detectActions([
      entry("reading physics", "2026-11-08"),
      entry("reading physics", "2026-11-09"),
      entry("cooking pasta", "2026-11-10"),
    ]);
    const physics = found.find((c) => c.phrase === "physics");
    const pasta = found.find((c) => c.phrase === "pasta");
    expect(physics?.weight).toBe(2);
    expect(pasta?.weight).toBe(1);
    expect(found.indexOf(physics!)).toBeLessThan(found.indexOf(pasta!));
  });

  it("keeps single-mention topics — the window is only 10 days", () => {
    const found = detectActions([entry("practiced piano scales")]);
    expect(found.map((c) => c.phrase)).toContain("piano scales");
  });
});
