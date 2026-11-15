import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().max(50).optional(),
    nudge: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.nudge !== undefined, {
    message: "Nothing to update.",
  });
