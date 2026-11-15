import { describe, expect, it } from "vitest";
import { createTaskSchema, deleteTaskSchema, updateTaskSchema } from "./schemas";

describe("createTaskSchema", () => {
  it("accepts real tasks and trims", () => {
    expect(createTaskSchema.parse({ text: "  buy flowers  " })).toEqual({
      text: "buy flowers",
    });
  });

  it("rejects empty and oversized tasks", () => {
    expect(createTaskSchema.safeParse({ text: "" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ text: "x".repeat(301) }).success).toBe(false);
  });

  it("rejects unexpected fields", () => {
    expect(
      createTaskSchema.safeParse({ text: "ok", schedule: "monday" }).success,
    ).toBe(false);
  });
});

describe("update/delete schemas", () => {
  it("accepts toggles and deletes with an id", () => {
    expect(updateTaskSchema.safeParse({ id: "abc", done: true }).success).toBe(true);
    expect(deleteTaskSchema.safeParse({ id: "abc" }).success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(updateTaskSchema.safeParse({ done: true }).success).toBe(false);
    expect(deleteTaskSchema.safeParse({}).success).toBe(false);
  });
});
