"use client";

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestEmailCode,
  verifyEmailCode,
} from "@/features/auth/client-api";
import {
  signInCodeFormSchema,
  signInEmailFormSchema,
  type SignInCodeForm,
  type SignInEmailForm,
} from "@/features/auth/schemas";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";

const RESEND_COOLDOWN_SECONDS = 30;

export function AuthExperience() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState<"email" | "code">("email");
  const [userId, setUserId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const emailForm = useForm<SignInEmailForm>({
    resolver: zodResolver(signInEmailFormSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });
  const codeForm = useForm<SignInCodeForm>({
    resolver: zodResolver(signInCodeFormSchema),
    defaultValues: { code: "" },
    mode: "onChange",
  });
  const codeValue = useWatch({ control: codeForm.control, name: "code" });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendCode = async (email: string) => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      setUserId(await requestEmailCode(email.trim()));
      codeForm.reset({ code: "" });
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Code not sent"));
    } finally {
      setPending(false);
    }
  };

  const onEmailSubmit = emailForm.handleSubmit((values) =>
    sendCode(values.email),
  );

  const resend = async () => {
    if (pending || cooldown > 0) return;
    const email = emailForm.getValues("email");
    if (!email) {
      setStep("email");
      return;
    }
    await sendCode(email);
  };

  const verify = async (value: string) => {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      await verifyEmailCode(userId, value);
      useUserStore.getState().reset();
      const target = next && next.startsWith("/") ? next : "/";
      router.replace(target);
    } catch (cause) {
      codeForm.setValue("code", "", { shouldValidate: false });
      setError(getApiErrorMessage(cause, "Code not verified"));
      setPending(false);
    }
  };

  const onCodeSubmit = codeForm.handleSubmit((values) =>
    verify(values.code),
  );

  const backToEmail = () => {
    setStep("email");
    codeForm.reset({ code: "" });
    setError("");
    setCooldown(0);
  };

  const emailError = emailForm.formState.errors.email?.message;
  const codeError = codeForm.formState.errors.code?.message;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-xs">
        <header className="mb-10 flex flex-col items-center text-center">
          <span className="type-brand text-foreground">
            Mono
          </span>
          <h1 className="type-title mt-4 text-foreground">
            {step === "email" ? "Sign in" : "Check your email"}
          </h1>
          <p className="mt-1.5 text-sm text-foreground">
            {step === "email" ? (
              "No password. We'll email you a code."
            ) : (
              <>
                Code sent to{" "}
                <span className="font-medium text-foreground">
                  {emailForm.getValues("email")}
                </span>
              </>
            )}
          </p>
        </header>

        {step === "email" ? (
          <form className="grid gap-4" onSubmit={(event) => void onEmailSubmit(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                autoFocus
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "email-error" : undefined}
                id="email"
                inputMode="email"
                spellCheck={false}
                type="email"
                {...emailForm.register("email")}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-destructive">
                  {emailError}
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              aria-busy={pending}
              className="h-10 w-full"
              disabled={pending}
              type="submit"
            >
              {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {pending ? "Sending…" : "Continue"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-4">
            <form className="grid gap-4" onSubmit={(event) => void onCodeSubmit(event)}>
              <div className="grid gap-1.5">
                <Label htmlFor="code">Six-digit code</Label>
                <Controller
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <Input
                      autoComplete="one-time-code"
                      autoFocus
                      aria-invalid={codeError ? true : undefined}
                      aria-describedby={codeError ? "code-error" : undefined}
                      className="h-12 text-center text-lg font-semibold tracking-[0.5em]"
                      disabled={pending}
                      id="code"
                      inputMode="numeric"
                      maxLength={6}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        const value = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        field.onChange(value);
                        if (value.length === 6 && !pending) {
                          void verify(value);
                        }
                      }}
                      pattern="[0-9]{6}"
                      ref={field.ref}
                      value={field.value}
                    />
                  )}
                />
                {codeError && (
                  <p id="code-error" className="text-sm text-destructive">
                    {codeError}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                aria-busy={pending}
                className="h-10 w-full"
                disabled={pending || codeValue.length !== 6}
                type="submit"
              >
                {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {pending ? "Verifying…" : "Sign in"}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <Button
                className="h-auto gap-1 px-0 text-sm"
                disabled={pending}
                onClick={backToEmail}
                type="button"
                variant="link"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={2} />
                Change email
              </Button>
              <Button
                className="h-auto px-0 text-sm no-underline hover:no-underline"
                disabled={pending || cooldown > 0}
                onClick={() => void resend()}
                type="button"
                variant="link"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col items-center gap-2.5">
        {/* Stash is public (IndexedDB-only) — let sign-outs reach it here. */}
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground outline-none underline decoration-border underline-offset-4 transition hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
          href="/stash"
        >
          Try Stash — files on this device, no account needed
          <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
        </Link>
        <p className="type-eyebrow text-foreground">
          A slow, private journal
        </p>
      </div>
    </main>
  );
}
