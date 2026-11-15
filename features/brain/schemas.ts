import { z } from "zod";

export const createTaskSchema = z
  .object({
    text: z.string().trim().min(1).max(300),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    id: z.string().min(1).max(64),
    done: z.boolean(),
  })
  .strict();

export const deleteTaskSchema = z
  .object({
    id: z.string().min(1).max(64),
  })
  .strict();
