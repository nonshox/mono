"use client";

import {
  ArrowLeft,
  LoaderCircle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { saveUserName } from "@/features/users/client-api";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";
import Link from "next/link";

/** Ultra-minimal editor â€” name, nothing else. */
export function ProfileEditor() {
  const router = useRouter();
  const loadUser = useUserStore((state) => state.load);
  const setUser = useUserStore((state) => state.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    loadUser()
      .then(() => {
        if (!active) return;
        const current = useUserStore.getState().user;
        if (current) {
          setName(current.name);
          setEmail(current.email);
        }
      })
      .catch(() => {
        if (active) toast.error("Your profile could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadUser]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true);
    try {
      const saved = await saveUserName(name.trim());
      setUser(saved);
      toast.success("Profile saved.");
      router.push("/profile");
    } catch (cause) {
      toast.error(
        getApiErrorMessage(cause, "Your profile could not be saved."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Link
            aria-label="Back to profile"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href="/profile"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Link>
          <h1 className="type-title text-foreground">
            Edit profile
          </h1>
        </header>

        <form onSubmit={(event) => void submit(event)}>
          {/* Name */}
          <label className="block border-b border-border/60 py-4">
            <span className="type-eyebrow">
              Name
            </span>
            <input
              autoFocus
              className="mt-1 h-10 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              disabled={loading}
              maxLength={50}
              onChange={(event) => {
                setName(event.target.value);
                setDirty(true);
              }}
              placeholder="Your name"
              value={name}
            />
          </label>

          {/* Email */}
          <div className="border-b border-border/60 py-4">
            <span className="type-eyebrow">
              Email
            </span>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Lock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">{email}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tied to your sign-in â€” can&apos;t be changed here.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 sm:flex-none sm:px-8"
              disabled={loading || saving || !dirty}
              type="submit"
            >
              {saving ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </button>
            <Link
              className="inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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


