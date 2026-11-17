"use client";

import { LoaderCircle, SpellCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { polishEntry } from "@/features/ai/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "cn";

/**
 * Local cleanup of dictated text: fillers out, sentence starts capitalized,
 * terminal punctuation ensured, meaning untouched. Hidden until the draft
 * holds at least a few words.
 */
export function PolishButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  if (value.trim().length < 10) return null;

  const tidy = async () => {
    if (loading) return;
    setLoading(true);
    const original = value;
    try {
      onChange(await polishEntry(original));
      toast.success("Tidied", {
        action: { label: "Undo", onClick: () => onChange(original) },
      });
    } catch (cause) {
      onChange(original);
      toast.error(getApiErrorMessage(cause, "Tidy failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      aria-busy={loading}
      aria-label="Tidy dictation"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border border-border text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={() => void tidy()}
      type="button"
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <SpellCheck aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
