import { z } from "zod";

export const profileNameFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name can't be empty.")
      .max(50, "Keep it under 50 characters."),
  })
  .strict();

export type ProfileNameForm = z.infer<typeof profileNameFormSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().trim().max(50).optional(),
    nudge: z.boolean().optional(),
    ai: z.boolean().optional(),
    actions: z
      .array(z.string().trim().min(2).max(64))
      .max(20)
      .optional(),
    tz: z
      .string()
      .trim()
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Unknown timezone")
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.nudge !== undefined ||
      value.ai !== undefined ||
      value.tz !== undefined ||
      value.actions !== undefined,
    { message: "Nothing to update." },
  );
