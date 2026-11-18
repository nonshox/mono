"use client";

import { LoaderCircle, Plus, Wand, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { saveUserActions } from "@/features/users/client-api";
import { suggestActions } from "@/features/ai/actions-client";
import { getApiErrorMessage } from "@/lib/api-client";

/**
 * What the user is actively doing. Read-only by default — the chips are plain
 * text. "Manage" reveals the × on each chip; "Done" returns to the clean view.
 */
export function ActionsEditor({ initial }: { initial: string[] }) {
  const [actions, setActions] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [managing, setManaging] = useState(false);

  const commit = async (next: string[], previous: string[]) => {
    setSaving(true);
    try {
      const saved = await saveUserActions(next);
      setActions(saved.actions ?? []);
      toast.success("Saved");
    } catch (cause) {
      setActions(previous);
      toast.error(getApiErrorMessage(cause, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const addAction = async (value: string) => {
    const trimmed = value.trim();
    if (
      !trimmed ||
      actions.some((action) => action.toLowerCase() === trimmed.toLowerCase())
    ) {
      return;
    }
    const previous = [...actions];
    setActions([...actions, trimmed]);
    setDraft("");
    await commit([...actions, trimmed], previous);
  };

  const removeAction = async (value: string) => {
    const previous = [...actions];
    const next = actions.filter((action) => action !== value);
    setActions(next);
    await commit(next, previous);
  };

  const scan = async () => {
    setScanning(true);
    try {
      const { actions: suggestions, stats } = await suggestActions();
      if (stats.entries === 0 && stats.timelineItems === 0) {
        toast.message(`No writing in the last ${stats.windowDays} days to scan.`);
        return;
      }
      const known = new Set(actions.map((action) => action.toLowerCase()));
      const fresh = suggestions.filter(
        (suggestion) => !known.has(suggestion.toLowerCase()),
      );
      if (fresh.length === 0) {
        toast.message(
          suggestions.length === 0
            ? `Scanned ${stats.entries} ${stats.entries === 1 ? "entry" : "entries"} — found nothing new yet.`
            : "Everything found is already on your list.",
        );
        return;
      }
      const previous = [...actions];
      const merged = [...actions, ...fresh.slice(0, 8)];
      setActions(merged);
      await commit(merged, previous);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Scan failed"));
    } finally {
      setScanning(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await addAction(draft);
  };

  return (
    <section aria-label="Actions" className="border-t border-border/60 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-eyebrow">Actions</h2>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Scan my last 10 days for actions"
            className="size-8 rounded-full disabled:opacity-40"
            disabled={scanning || saving}
            onClick={() => void scan()}
            size="icon"
            title="Scan my last 10 days"
            type="button"
            variant="ghost"
          >
            {scanning ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Wand aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
          </Button>
          <Button
            aria-pressed={managing}
            className="h-8 rounded-full px-3 text-xs font-semibold"
            onClick={() => setManaging((value) => !value)}
            type="button"
            variant="ghost"
          >
            {managing ? "Done" : "Manage"}
          </Button>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-1.5">
        {actions.map((action) => (
          <li
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground"
            key={action}
          >
            {action}
            {managing && (
              <Button
                aria-label={`Remove ${action}`}
                className="size-4 rounded-full hover:bg-foreground/10"
                onClick={() => void removeAction(action)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-3" strokeWidth={2} />
              </Button>
            )}
          </li>
        ))}
        {actions.length === 0 && (
          <li className="text-xs text-foreground/70">
            Tap the wand to scan your writing, or add one below.
          </li>
        )}
      </ul>

      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(event) => void onSubmit(event)}
      >
        <Input
          aria-label="Add an action"
          className="h-9 min-w-0 flex-1 rounded-full border-0 bg-muted px-4 text-sm font-medium text-foreground placeholder:text-foreground/40 focus-visible:border-transparent focus-visible:ring-2"
          maxLength={64}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add an action"
          spellCheck={false}
          value={draft}
        />
        <Button
          aria-label="Add action"
          className="size-9 rounded-full disabled:opacity-30"
          disabled={!draft.trim() || saving}
          size="icon"
          type="submit"
          variant="default"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </Button>
      </form>
    </section>
  );
}
