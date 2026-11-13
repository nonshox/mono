import { z } from "zod";

export const createWorkoutSchema = z
  .object({
    kind: z.literal("pushup"),
    reps: z.number().int().min(0).max(10000),
    duration: z.number().int().min(0).max(100000),
    score: z.number().int().min(0).max(100).optional(),
  })
  .strict();
