import { z } from "zod";

export const createWorkoutSchema = z
  .object({
    kind: z.enum(["pushup", "squat", "plank"]),
    reps: z.number().int().min(0).max(10000),
    duration: z.number().int().min(0).max(100000),
  })
  .strict();
