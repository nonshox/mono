"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appendDay } from "@/features/days/client-api";
import { getApiErrorMessage } from "@/lib/api-client";

/**
 * Evening gratitude line — one short line, appended straight into today's
 * dot. Evidence: gratitude journaling measurably improves well-being (small
 * effect, compounding over weeks). Nothing else is asked of the user.
 */
export function GratitudeLine({ day }: { day: string }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await appendDay(day, text);
      setDraft("");
      toast.success("Added to today");
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "That line couldn't be saved"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2"
      onSubmit={submit}
    >
      <Sparkles
        aria-hidden="true"
        className="size-3.5 shrink-0 text-foreground/60"
        strokeWidth={1.8}
      />
      <Input
        aria-label="One thing you're glad happened"
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs placeholder:text-foreground/40 focus-visible:border-transparent focus-visible:ring-0 md:text-xs"
        disabled={saving}
        maxLength={300}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="one thing you're glad happened…"
        spellCheck={false}
        value={draft}
      />
      <Button
        aria-label="Add to today"
        className="size-7 shrink-0 rounded-full disabled:opacity-30"
        disabled={!draft.trim() || saving}
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
      </Button>
    </form>
  );
}
