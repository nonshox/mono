import { describe, expect, it } from "vitest";
import { createWorkoutSchema } from "./schemas";

describe("workout input", () => {
  it("accepts a valid pushup session", () => {
    expect(
      createWorkoutSchema.safeParse({ kind: "pushup", reps: 25, duration: 120 })
        .success,
    ).toBe(true);
    // Legacy `score` payloads are rejected now that form scoring is gone.
    expect(
      createWorkoutSchema.safeParse({
        kind: "pushup",
        reps: 25,
        duration: 120,
        score: 87,
      }).success,
    ).toBe(false);
  });

  it("rejects bad payloads and extra fields", () => {
    expect(
      createWorkoutSchema.safeParse({ kind: "squat", reps: 10, duration: 60 })
        .success,
    ).toBe(true);
    expect(
      createWorkoutSchema.safeParse({ kind: "plank", reps: 0, duration: 60 })
        .success,
    ).toBe(true);
    expect(
      createWorkoutSchema.safeParse({ kind: "pushup", reps: 10001, duration: 60 })
        .success,
    ).toBe(false);
    expect(
      createWorkoutSchema.safeParse({ kind: "pushup", reps: 5, duration: 60, user: "forged" })
        .success,
    ).toBe(false);
  });
});
