"use client";

import { Check, LoaderCircle, PenLine, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MicButton } from "@/components/shared/mic-button";
import { PolishButton } from "@/components/shared/polish-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteDay, saveDay } from "@/features/days/client-api";
import { getApiErrorMessage } from "@/lib/api-client";

function todayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/**
 * The journal's front door — one tap writes today, in place. Emptying the
 * draft clears today's entry (the same semantics as "Erase" elsewhere).
 */
export function TodayStrip({
  today,
  initialText,
  onSaved,
}: {
  today: string;
  initialText: string | null;
  /** Receives the committed text ("" after a clear) so the parent feed can update in place. */
  onSaved: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialText ?? "");
  const [saving, setSaving] = useState(false);

  const open = () => {
    setDraft(initialText ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setDraft(initialText ?? "");
    setEditing(false);
  };

  const commit = async () => {
    const text = draft.trim();
    // Nothing changed — just close.
    if (text === (initialText ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (!text) {
        if (initialText) await deleteDay(today);
        onSaved("");
      } else {
        const saved = await saveDay(today, text);
        onSaved(saved.text);
      }
      toast.success(text ? "Saved" : "Day cleared");
      setEditing(false);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Day not saved"));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Button
        aria-label={initialText ? "Edit today's entry" : "Write today's entry"}
        className="h-12 w-full justify-start gap-2.5 rounded-2xl border-2 border-border/70 bg-popover px-4 text-left"
        onClick={open}
        type="button"
        variant="outline"
      >
        <PenLine
          aria-hidden="true"
          className="size-4 shrink-0 text-foreground"
          strokeWidth={1.8}
        />
        <span className="shrink-0 type-eyebrow text-foreground">Today</span>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
          {initialText ?? "Write today…"}
        </span>
      </Button>
    );
  }

  return (
    <div
      aria-label={`Today, ${todayLabel(today)}`}
      className="rounded-2xl border-2 border-border/80 bg-popover p-3"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <p className="type-eyebrow text-foreground">Today</p>
        <div className="flex items-center gap-1">
          <MicButton onChange={setDraft} value={draft} />
          <PolishButton onChange={setDraft} value={draft} />
          <Button
            aria-label="Discard changes"
            className="size-7 rounded-full"
            onClick={cancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={2} />
          </Button>
          <Button
            aria-busy={saving}
            aria-label="Save today"
            className="size-7 rounded-full"
            disabled={saving}
            onClick={() => void commit()}
            size="icon"
            type="button"
            variant="ghost"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
            )}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1 pt-0.5" role="group" aria-label="Feeling right now">
        {(["calm", "clear", "flat", "tense", "wired", "okay"] as const).map((feeling) => {
          const token = `feeling:${feeling}`;
          const active = new RegExp(`\\b${token}\\b`, "i").test(draft);
          return (
            <Button
              aria-pressed={active}
              className={`h-7 rounded-full border px-2.5 text-[11px] font-semibold lowercase transition ${
                active
                  ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                  : "border-border text-foreground/70 hover:border-foreground/50 hover:bg-transparent"
              }`}
              key={feeling}
              onClick={() => {
                const re = new RegExp(`\\s*,?\\s*feeling:\\s*${feeling}\\b\\s*,?`, "ig");
                setDraft((current) => {
                  if (re.test(current)) {
                    return current
                      .replace(re, " ")
                      .replace(/\s{2,}/g, " ")
                      .replace(/^,\s*/, "")
                      .replace(/,\s*$/, "")
                      .trim();
                  }
                  return current.trim() ? `${current.trim()} ${token}` : token;
                });
              }}
              type="button"
              variant="ghost"
            >
              {feeling}
            </Button>
          );
        })}
      </div>

      <Textarea
        aria-label="Today's entry"
        autoFocus
        className="min-h-28 w-full resize-none border-0 bg-transparent p-1 text-sm leading-6 placeholder:text-foreground/50 focus-visible:border-transparent focus-visible:ring-0"
        maxLength={1000}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            void commit();
          }
          if (event.key === "Escape") cancel();
        }}
        placeholder="What happened today?"
        value={draft}
      />
      {draft.length >= 800 && (
        <p
          className={`px-1 pb-1 text-right text-[10px] tabular-nums ${
            draft.length >= 950 ? "text-destructive" : "text-foreground"
          }`}
        >
          {draft.length} / 1000
        </p>
      )}
    </div>
  );
}
