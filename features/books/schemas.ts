import { z } from "zod";

/** Loose id — Appwrite ids are 36 chars max, keep headroom for safety. */
export const bookIdSchema = z.string().trim().min(1).max(64);

const titleSchema = z.string().trim().min(1, "Title is required.").max(200);
const authorSchema = z.string().trim().max(200);
const noteSchema = z.string().trim().max(1000);
const daysSchema = z
  .number()
  .int("Whole days, please.")
  .min(1, "At least 1 day.")
  .max(3650, "That is a long read even for Mono.")
  .nullable();

export const bookInputSchema = z
  .object({
    title: titleSchema,
    author: authorSchema.default(""),
    note: noteSchema.default(""),
    days: daysSchema.default(null),
  })
  .strict();

export const updateBookSchema = z
  .object({
    id: bookIdSchema,
    title: titleSchema,
    author: authorSchema.default(""),
    note: noteSchema.default(""),
    days: daysSchema.default(null),
  })
  .strict();

export const deleteBookSchema = z
  .object({
    id: bookIdSchema,
  })
  .strict();

export type BookInput = z.infer<typeof bookInputSchema>;
