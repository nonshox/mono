import { describe, expect, it } from "vitest";
import { classifyTelegramText } from "./commands";

describe("telegram intent classification", () => {
  it("parses bare and coded /start", () => {
    expect(classifyTelegramText("/start")).toEqual({ kind: "start", code: undefined });
    expect(classifyTelegramText(`/start ${"a".repeat(64)}`)).toEqual({
      kind: "start",
      code: "a".repeat(64),
    });
  });

  it("recognizes /today with or without mention", () => {
    expect(classifyTelegramText("/today")).toEqual({ kind: "today" });
    expect(classifyTelegramText("/Today")).toEqual({ kind: "today" });
    expect(classifyTelegramText("/today@mono_bot")).toEqual({ kind: "today" });
  });

  it("recognizes /week", () => {
    expect(classifyTelegramText("/week")).toEqual({ kind: "week" });
    expect(classifyTelegramText("/Week@mono_bot")).toEqual({ kind: "week" });
  });

  it("treats any plain non-command text as a capture", () => {
    expect(classifyTelegramText("slept badly, woke at 4")).toEqual({
      kind: "capture",
      text: "slept badly, woke at 4",
    });
    expect(classifyTelegramText("  leading and trailing  ")).toEqual({
      kind: "capture",
      text: "leading and trailing",
    });
  });

  it("returns help for unknown commands and empty input", () => {
    expect(classifyTelegramText("/foo bar")).toEqual({ kind: "help" });
    expect(classifyTelegramText("")).toEqual({ kind: "help" });
    expect(classifyTelegramText("   ")).toEqual({ kind: "help" });
  });
});
