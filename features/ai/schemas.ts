import { z } from "zod";

export const polishEntrySchema = z
  .object({
    text: z.string().trim().min(10).max(1000),
  })
  .strict();
