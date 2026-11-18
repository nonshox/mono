import { z } from "zod";

const bucketSchema = z.enum(["rise", "midday", "evening"]);

export const createItemSchema = z
  .object({
    bucket: bucketSchema,
    text: z.string().trim().min(1).max(150),
  })
  .strict();

export const patchItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("toggle"), id: z.string().min(1).max(64), done: z.boolean() }).strict(),
  z.object({ kind: z.literal("move"), id: z.string().min(1).max(64), direction: z.enum(["up", "down"]) }).strict(),
  z.object({ kind: z.literal("edit"), id: z.string().min(1).max(64), text: z.string().trim().min(1).max(150) }).strict(),
  z.object({
    kind: z.literal("reorder"),
    bucket: bucketSchema,
    ids: z.array(z.string().min(1).max(64)).min(1).max(500),
  }).strict(),
]);

export const deleteItemSchema = z
  .object({
    id: z.string().min(1).max(64),
  })
  .strict();

export const satisfySchema = z
  .object({
    satisfied: z.number().int().min(0).max(100),
  })
  .strict();
