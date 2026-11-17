"use client";

import { LoaderCircle, Plus, Wand, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { saveUserActions } from "@/features/users/client-api";
import { suggestActions } from "@/features/ai/actions-client";
import { getApiErrorMessage } from "@/lib/api-client";

/** Things the user is actively doing these days — editable list, stored on their row. */
export function ActionsEditor({ initial }: { initial: string[] }) {
  const [actions, setActions] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

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
    if (!trimmed || actions.some((action) => action.toLowerCase() === trimmed.toLowerCase())) {
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
    <section aria-label="Actions" className="border-b border-border/60 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-eyebrow">Actions</h2>
        <button
          aria-label="Scan my last 10 days for actions"
          className="grid size-7 shrink-0 place-items-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          disabled={scanning || saving}
          onClick={() => void scan()}
          title="Scan my last 10 days"
          type="button"
        >
          {scanning ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Wand aria-hidden="true" className="size-4" strokeWidth={1.8} />
          )}
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-1.5">
        {actions.map((action) => (
          <li
            className="inline-flex items-center gap-0.5 rounded-full border border-border/70 py-0.5 pl-2.5 pr-1 text-xs font-medium"
            key={action}
          >
            {action}
            <button
              aria-label={`Remove ${action}`}
              className="grid size-4 shrink-0 place-items-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void removeAction(action)}
              type="button"
            >
              <X aria-hidden="true" className="size-3" strokeWidth={2.2} />
            </button>
          </li>
        ))}
        {actions.length === 0 && (
          <li className="text-xs text-foreground/70">
            Tap the wand to scan your writing, or add one below.
          </li>
        )}
      </ul>
      <form className="mt-2 flex items-center gap-1.5" onSubmit={(event) => void onSubmit(event)}>
        <input
          aria-label="Add an action"
          className="h-8 min-w-0 flex-1 rounded-full border border-border/70 bg-transparent px-3 text-xs font-medium text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={64}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add an action"
          spellCheck={false}
          value={draft}
        />
        <button
          aria-label="Add action"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          disabled={!draft.trim() || saving}
          type="submit"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
      </form>
    </section>
  );
}
