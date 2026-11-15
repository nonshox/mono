import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().max(50).optional(),
    nudge: z.boolean().optional(),
    ai: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined || value.nudge !== undefined || value.ai !== undefined,
    { message: "Nothing to update." },
  );
