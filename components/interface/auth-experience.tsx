"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestEmailCode,
  verifyEmailCode,
} from "@/features/auth/client-api";
import { useNotificationStore } from "@/features/notifications/store";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";

const RESEND_COOLDOWN_SECONDS = 30;

export function AuthExperience() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const verifying = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendCode = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    try {
      setUserId(await requestEmailCode(email.trim()));
      setCode("");
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (cause) {
      setError(
        getApiErrorMessage(cause, "We could not send a sign-in code."),
      );
    } finally {
      setPending(false);
    }
  };

  const verify = async (value: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setPending(true);
    setError("");

    try {
      await verifyEmailCode(userId, value);
      useNotificationStore.getState().reset();
      useUserStore.getState().reset();
      router.replace("/");
    } catch (cause) {
      setCode("");
      setError(getApiErrorMessage(cause, "That code could not be verified."));
      verifying.current = false;
      setPending(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setCode("");
    setError("");
    setCooldown(0);
  };

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
          <p className="mt-1.5 text-sm text-muted-foreground">
            {step === "email" ? (
              "No password — we\u2019ll email you a one-time code."
            ) : (
              <>
                Code sent to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </>
            )}
          </p>
        </header>

        {step === "email" ? (
          <form className="grid gap-4" onSubmit={(event) => void sendCode(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                autoFocus
                id="email"
                inputMode="email"
                name="email"
                spellCheck={false}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              aria-busy={pending}
              className="h-10 w-full"
              disabled={pending || !email.trim()}
              type="submit"
            >
              {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {pending ? "Sending…" : "Continue"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-4">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void verify(code);
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="code">Six-digit code</Label>
                <Input
                  autoComplete="one-time-code"
                  autoFocus
                  className="h-12 text-center text-lg font-semibold tracking-[0.5em]"
                  disabled={pending}
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  name="code"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);
                    setCode(value);
                    if (value.length === 6) void verify(value);
                  }}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                aria-busy={pending}
                className="h-10 w-full"
                disabled={pending || code.length !== 6}
                type="submit"
              >
                {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {pending ? "Verifying…" : "Sign in"}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <button
                className="inline-flex items-center gap-1 text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={pending}
                onClick={backToEmail}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={2} />
                Change email
              </button>
              <button
                className="text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={pending || cooldown > 0}
                onClick={() => void sendCode()}
                type="button"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="type-eyebrow mt-12 text-muted-foreground/60">
        Mono — a minimal app base
      </p>
    </main>
  );
}
