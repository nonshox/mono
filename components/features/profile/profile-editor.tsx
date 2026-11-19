"use client";

import { ArrowLeft, LoaderCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveUserName } from "@/features/users/client-api";
import { Button } from "@/components/ui/button";
import {
  profileNameFormSchema,
  type ProfileNameForm,
} from "@/features/users/schemas";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";
import Link from "next/link";

/** Name-only editor — the photo lives on /profile. */
export function ProfileEditor() {
  const router = useRouter();
  const loadUser = useUserStore((state) => state.load);
  const setUser = useUserStore((state) => state.setUser);
  const storedEmail = useUserStore((state) => state.user?.email ?? "");

  const form = useForm<ProfileNameForm>({
    resolver: zodResolver(profileNameFormSchema),
    defaultValues: { name: "" },
    mode: "onSubmit",
  });
  const { isDirty, isSubmitting } = form.formState;
  const nameError = form.formState.errors.name?.message;

  useEffect(() => {
    let active = true;
    loadUser()
      .then(() => {
        if (!active) return;
        const current = useUserStore.getState().user;
        if (current) form.reset({ name: current.name });
      })
      .catch(() => {
        if (active) toast.error("Profile unavailable");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadUser]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await saveUserName(values.name);
      setUser(saved);
      toast.success("Saved");
      router.push("/profile");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Profile not saved"));
    }
  });

  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Link
            aria-label="Back to profile"
            className="grid size-9 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href="/profile"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Link>
          <h1 className="type-title text-foreground">
            Edit profile
          </h1>
        </header>

        <form onSubmit={(event) => void onSubmit(event)}>
          {/* Name */}
          <label className="block border-b border-border/60 py-4">
            <span className="type-eyebrow">
              Name
            </span>
            <Input
              autoFocus
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "name-error" : undefined}
              className="mt-1 h-10 w-full border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 md:text-sm"
              maxLength={50}
              placeholder="Your name"
              {...form.register("name")}
            />
            {nameError && (
              <p id="name-error" className="mt-1 text-xs text-destructive">
                {nameError}
              </p>
            )}
          </label>

          {/* Email */}
          <div className="border-b border-border/60 py-4">
            <span className="type-eyebrow">
              Email
            </span>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Lock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">{storedEmail}</span>
            </div>
            <p className="mt-1 text-xs text-foreground">
              Tied to your sign-in — can&apos;t be changed here.
            </p>
          </div>

          {/* Save */}
          <div className="mt-6 flex items-center gap-3">
            <Button
              className="h-11 flex-1 rounded-full text-xs font-semibold disabled:opacity-30 sm:flex-none sm:px-8"
              disabled={isSubmitting || !isDirty}
              type="submit"
              variant="default"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
            <Link
              className="inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              href="/profile"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
