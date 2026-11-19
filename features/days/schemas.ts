import { z } from "zod";

const dayKeyRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** YYYY-MM-DD that must round-trip through Date (rejects 2026-02-30). */
export const dayKeySchema = z
  .string()
  .regex(dayKeyRegex, "Expected a date like 2026-11-15.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "That is not a real calendar date.");

export const upsertDaySchema = z
  .object({
    day: dayKeySchema,
    text: z.string().trim().min(1).max(1000),
  })
  .strict();

/** One short line appended to the day — gratitude prompts stay small. */
export const appendDaySchema = z
  .object({
    day: dayKeySchema,
    text: z.string().trim().min(1).max(300),
  })
  .strict();

export const deleteDaySchema = z
  .object({
    day: dayKeySchema,
  })
  .strict();

export const yearSchema = z
  .number()
  .int()
  .min(1970)
  .max(2200);
