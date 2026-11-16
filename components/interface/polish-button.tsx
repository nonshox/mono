"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { polishEntry } from "@/features/ai/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { useUserStore } from "@/features/users/store";
import { cn } from "cn";

/**
 * One-tap cleanup for dictated text: Gemini rewrites raw speech into clean
 * prose, keeping the writer's voice. Gated by the Mono AI setting; hidden
 * until the draft holds at least a few words.
 */
export function PolishButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const aiOn = useUserStore((state) => state.user?.ai ?? false);
  const [loading, setLoading] = useState(false);

  if (value.trim().length < 10) return null;

  const polish = async () => {
    if (loading) return;
    if (!aiOn) {
      toast.message("Enable Mono AI to polish");
      return;
    }
    setLoading(true);
    const original = value;
    try {
      onChange(await polishEntry(original));
      toast.success("Polished", {
        action: { label: "Undo", onClick: () => onChange(original) },
      });
    } catch (cause) {
      onChange(original);
      toast.error(getApiErrorMessage(cause, "Polish failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      aria-busy={loading}
      aria-label="Polish dictation with Mono AI"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        aiOn
          ? "border-border text-foreground hover:bg-muted"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
      onClick={() => void polish()}
      type="button"
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
