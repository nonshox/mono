"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/features/users/client-api";
import { getApiErrorMessage } from "@/lib/api-client";

/**
 * Danger zone — delete the account. Requires typing DELETE; irreversible.
 * Self-contained: own confirmation state, own error line, own redirect.
 */
export function SettingsDanger() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const canDelete = confirm.trim().toUpperCase() === "DELETE";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (deleting || !canDelete) return;
    void remove();
  };

  const remove = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      toast.success("Your account was deleted.");
      router.replace("/auth");
      router.refresh();
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Deletion failed"));
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label="Delete account"
      className="rounded-2xl border-2 border-destructive/30 bg-popover p-4 sm:p-5"
    >
      <h2 className="type-eyebrow text-destructive">Delete account</h2>
      <p className="mt-2 text-xs leading-5 text-foreground">
        Erases your dots, journal, sessions and avatar permanently.
        This cannot be undone.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={onSubmit}
      >
        <Input
          aria-label="Type DELETE to confirm account deletion"
          autoComplete="off"
          className="h-11 w-full shrink-0 rounded-xl border-border text-center text-xs font-bold uppercase tracking-[0.4em] placeholder:text-foreground/40 focus-visible:border-destructive sm:w-44"
          disabled={deleting}
          name="confirm"
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="DELETE"
          spellCheck={false}
          value={confirm}
        />
        <Button
          className="h-11 flex-1 gap-1.5 rounded-xl bg-destructive text-xs font-bold text-white hover:bg-destructive/85 disabled:cursor-not-allowed disabled:opacity-30"
          disabled={deleting || !canDelete}
          type="submit"
          variant="destructive"
        >
          {deleting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
          )}
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
      {error ? (
        <p className="mt-3 text-xs leading-5 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
