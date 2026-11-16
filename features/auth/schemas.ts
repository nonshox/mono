import { z } from "zod";

const userIdSchema = z
  .string()
  .min(1)
  .max(36)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

export const emailTokenRequestSchema = z
  .object({
    email: z.string().trim().pipe(z.email().max(254)),
  })
  .strict();

export const emailTokenVerifySchema = z
  .object({
    userId: userIdSchema,
    secret: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const revokeSessionSchema = z
  .object({
    sessionId: userIdSchema,
  })
  .strict();

export const signInEmailFormSchema = z
  .object({
    email: z.string().trim().pipe(z.email("Enter a valid email address.").max(254)),
  })
  .strict();

export const signInCodeFormSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  })
  .strict();

export type SignInEmailForm = z.infer<typeof signInEmailFormSchema>;
export type SignInCodeForm = z.infer<typeof signInCodeFormSchema>;

