"use client";

import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { FileInput } from "@/components/ui/file-input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { removeAvatar, uploadAvatar } from "@/features/users/client-api";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Interactive photo control for the profile page — upload, change, remove,
 * with busy + error states and store sync so the nav updates too.
 */
export function AvatarUploader({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  const setUser = useUserStore((state) => state.setUser);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Keep the photo under 2 MB");
      return;
    }
    setBusy(true);
    try {
      const saved = await uploadAvatar(file);
      setUser(saved);
      toast.success("Photo saved");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Photo not saved"));
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      const saved = await removeAvatar();
      setUser(saved);
      toast.success("Photo removed");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Photo not removed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <FileInput
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Choose a profile photo"
        onChange={(event) => void onPick(event)}
        ref={inputRef}
      />
      {/* Photo preview — tap to upload/change */}
      <Button
        aria-label={avatar ? "Change profile photo" : "Upload profile photo"}
        className="group relative size-[76px] rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="ghost"
      >
        <UserAvatar avatar={avatar || undefined} name={name} size={76} />
        {/* Hover/focus overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center rounded-full bg-foreground/45 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {busy ? (
            <LoaderCircle className="size-5 animate-spin text-background" />
          ) : (
            <Camera className="size-5 text-background" strokeWidth={1.8} />
          )}
        </span>
      </Button>
      {avatar && (
        <AlertDialog>
          <AlertDialogTrigger
            className="grid size-6 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            disabled={busy}
          >
            <span className="sr-only">Remove photo</span>
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.6} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Remove photo?</AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5">
              Your photo will be deleted and initials shown again. This cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction onClick={() => void onRemove()}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
