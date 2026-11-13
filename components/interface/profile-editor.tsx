"use client";

import {
  Camera,
  LoaderCircle,
  Lock,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearAvatar,
  fetchUser,
  saveAvatar,
  saveUserName,
} from "@/features/users/client-api";
import { UserAvatar } from "@/components/interface/user-avatar";
import { getApiErrorMessage } from "@/lib/api-client";

/** Focused editor for the profile — avatar, name, nothing else. */
export function ProfileEditor() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    fetchUser()
      .then((user) => {
        if (!active) return;
        setName(user.name);
        setEmail(user.email);
        setAvatar(user.avatar ?? "");
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
  }, []);

  const handlePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    if (!image || avatarPending) return;
    setAvatarPending(true);
    try {
      setAvatar(await saveAvatar(image));
      toast.success("Photo updated.");
    } catch (cause) {
      toast.error(
        getApiErrorMessage(cause, "Your photo could not be saved."),
      );
    } finally {
      setAvatarPending(false);
      event.target.value = "";
    }
  };

  const removeAvatar = async () => {
    if (avatarPending || !avatar) return;
    setAvatarPending(true);
    try {
      await clearAvatar();
      setAvatar("");
      toast.success("Photo removed.");
    } catch (cause) {
      toast.error(
        getApiErrorMessage(cause, "Your photo could not be removed."),
      );
    } finally {
      setAvatarPending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true);
    try {
      await saveUserName(name.trim());
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
    <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8">
      <header className="mb-6 text-center">
        <h1 className="type-section">Edit profile</h1>
        <p className="type-lead mt-1">How you appear in Mono Performance.</p>
      </header>

      <form
        className="surface-card overflow-hidden"
        onSubmit={(event) => void submit(event)}
      >
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-3 border-b border-border/60 px-6 py-6">
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a photo"
            className="sr-only"
            onChange={(event) => void handlePick(event)}
            ref={fileRef}
            type="file"
          />
          <button
            aria-label={avatar ? "Change photo" : "Add photo"}
            className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            <UserAvatar avatar={avatar} name={name || email} size={112} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid place-items-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {avatarPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-7 animate-spin text-white"
                />
              ) : (
                <Camera
                  aria-hidden="true"
                  className="size-7 text-white"
                  strokeWidth={1.8}
                />
              )}
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              {avatar ? "Change photo" : "Upload photo"}
            </button>
            {avatar && (
              <button
                className="text-xs font-semibold text-destructive underline-offset-4 hover:underline"
                onClick={() => void removeAvatar()}
                type="button"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-border/60">
          <label className="block px-5 py-4">
            <span className="type-eyebrow mb-1.5 block">Name</span>
            <Input
              autoFocus
              className="h-11 text-base"
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

          <div className="px-5 py-4">
            <span className="type-eyebrow mb-1.5 block">Email</span>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
              <Lock aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">{email}</span>
              <Mail aria-hidden="true" className="size-4 shrink-0 opacity-40" strokeWidth={1.8} />
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
              Tied to your sign-in — can&apos;t be changed here.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-border/60 p-4">
          <Button
            className="h-11 flex-1 rounded-xl text-sm"
            disabled={loading || saving || !dirty}
            type="submit"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
          <Button
            aria-label="Discard changes"
            className="h-11 w-11 rounded-xl text-muted-foreground"
            onClick={() => router.back()}
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </form>
    </main>
  );
}
