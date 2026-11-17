import { describe, expect, it } from "vitest";
import { buildMarkdown, buildPayload } from "./build";

const base = {
  exportedAt: "2026-11-17T13:00:00.000Z",
  profile: { name: "Sam", email: "sam@example.com" },
  days: [
    { day: "2026-11-15", text: "later day", satisfied: null },
    { day: "2026-11-14", text: "earlier day", satisfied: 68 },
  ],
  timeline: [
    { bucket: "evening", text: "phone away", order: 1, done: true },
    { bucket: "rise", text: "wake up", order: 0, done: true },
    { bucket: "rise", text: "shower", order: 1, done: false },
  ],
};

describe("buildPayload", () => {
  it("sorts days ascending and check items by bucket then order", () => {
    const payload = buildPayload(base);
    expect(payload.format).toBe("mono/1");
    expect(payload.days.map((d) => d.day)).toEqual(["2026-11-14", "2026-11-15"]);
    expect(payload.timeline.map((i) => `${i.bucket}:${i.text}`)).toEqual([
      "rise:wake up",
      "rise:shower",
      "evening:phone away",
    ]);
  });

  it("does not mutate the caller's arrays", () => {
    const days = [...base.days];
    buildPayload({ ...base, days });
    expect(days[0].day).toBe("2026-11-15");
  });
});

describe("buildMarkdown", () => {
  const payload = buildPayload(base);

  it("writes the profile and satisfaction markers", () => {
    const md = buildMarkdown(payload);
    expect(md).toContain("# Mono export");
    expect(md).toContain("Name: Sam");
    expect(md).toContain("Email: sam@example.com");
    expect(md).toContain("## 2026-11-14 · 68%");
    expect(md).toContain("## 2026-11-15");
  });

  it("groups check items by bucket with checkboxes", () => {
    const md = buildMarkdown(payload);
    expect(md).toContain("# Check");
    expect(md).toContain("## Rise");
    expect(md).toContain("- [x] wake up");
    expect(md).toContain("- [ ] shower");
    expect(md).toContain("## Evening");
    expect(md).toContain("- [x] phone away");
  });

  it("handles an empty journal", () => {
    const md = buildMarkdown(buildPayload({ ...base, days: [] }));
    expect(md).toContain("# Journal");
    expect(md).toContain("_Nothing written yet._");
  });
});
