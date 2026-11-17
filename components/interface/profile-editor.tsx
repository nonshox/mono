"use client";

import {
  ArrowLeft,
  Camera,
  LoaderCircle,
  Lock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveUserName, uploadAvatar, removeAvatar } from "@/features/users/client-api";
import {
  profileNameFormSchema,
  type ProfileNameForm,
} from "@/features/users/schemas";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";
import { UserAvatar } from "@/components/interface/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

/** Ultra-minimal editor — name, nothing else. */
export function ProfileEditor() {
  const router = useRouter();
  const loadUser = useUserStore((state) => state.load);
  const setUser = useUserStore((state) => state.setUser);
  const storedEmail = useUserStore((state) => state.user?.email ?? "");
  const storedName = useUserStore((state) => state.user?.name ?? "");
  const avatar = useUserStore((state) => state.user?.avatar ?? "");
  const [loading, setLoading] = useState(true);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Keep the photo under 2 MB");
      return;
    }
    setAvatarBusy(true);
    try {
      const saved = await uploadAvatar(file);
      setUser(saved);
      toast.success("Photo saved");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Photo not saved"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const onAvatarRemove = async () => {
    setAvatarBusy(true);
    try {
      const saved = await removeAvatar();
      setUser(saved);
      toast.success("Photo removed");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Photo not removed"));
    } finally {
      setAvatarBusy(false);
    }
  };

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
      })
      .finally(() => {
        if (active) setLoading(false);
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
      toast.error(
        getApiErrorMessage(cause, "Profile not saved"),
      );
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

        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-hidden="true"
          className="hidden"
          onChange={(event) => void onAvatarChange(event)}
          ref={fileInput}
          tabIndex={-1}
          type="file"
        />

        <form onSubmit={(event) => void onSubmit(event)}>
          {/* Photo */}
          <div className="flex items-center gap-4 border-b border-border/60 py-4">
            <UserAvatar
              avatar={avatar || undefined}
              name={storedName || storedEmail}
              size={72}
            />
            <div className="min-w-0 flex-1">
              <span className="type-eyebrow">Photo</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-border px-3.5 text-xs font-semibold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  disabled={loading || avatarBusy}
                  onClick={() => fileInput.current?.click()}
                  type="button"
                >
                  {avatarBusy ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <Camera aria-hidden="true" className="size-3.5" strokeWidth={2} />
                  )}
                  {avatar ? "Change photo" : "Upload photo"}
                </button>
                {avatar && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      aria-label="Remove photo"
                      className="grid size-8 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      disabled={loading || avatarBusy}
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Remove photo?</AlertDialogTitle>
                      <AlertDialogDescription className="mt-1.5">
                        Your photo will be deleted and initials shown again. This cannot be undone.
                      </AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void onAvatarRemove()}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
          {/* Name */}
          <label className="block border-b border-border/60 py-4">
            <span className="type-eyebrow">
              Name
            </span>
            <input
              autoFocus
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "name-error" : undefined}
              className="mt-1 h-10 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              disabled={loading}
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

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 sm:flex-none sm:px-8"
              disabled={loading || isSubmitting || !isDirty}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </button>
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
