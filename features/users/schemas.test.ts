import { describe, expect, it } from "vitest";
import { updateUserSchema } from "./schemas";

describe("user update input", () => {
  it("trims whitespace and accepts reasonable names", () => {
    expect(updateUserSchema.parse({ name: "  Sam Rivera " })).toEqual({
      name: "Sam Rivera",
    });
    expect(updateUserSchema.parse({ name: "" }).name).toBe("");
  });

  it("accepts a nudge-only update", () => {
    expect(updateUserSchema.parse({ nudge: true })).toEqual({ nudge: true });
    expect(
      updateUserSchema.parse({ name: "Sam", nudge: false }),
    ).toEqual({ name: "Sam", nudge: false });
  });

  it("rejects empty payloads and unexpected fields", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(
      updateUserSchema.safeParse({ name: "x".repeat(51) }).success,
    ).toBe(false);
    expect(
      updateUserSchema.safeParse({ name: "Sam", email: "a@b.c" }).success,
    ).toBe(false);
  });
});
