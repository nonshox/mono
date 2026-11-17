"use client";

import { Check, LoaderCircle, Plus, Wand, Trash2, ArrowUp, ArrowDown, SlidersHorizontal, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCheckStore,
} from "@/features/check/store";
import { suggestBucket } from "@/features/ai/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { BUCKET_LABELS } from "@/features/check/types";
import type { TimelineItem, Bucket } from "@/features/check/types";
import { cn } from "cn";
import { ProgressRing } from "@/components/interface/progress-ring";
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

const BUCKETS = ["rise", "midday", "evening"] as const;

// Satisfaction is an evening practice only — before 6pm the button stays disabled.
const SATISFY_AFTER_HOUR = 18;

function canSatisfy(): boolean {
  return new Date().getHours() >= SATISFY_AFTER_HOUR;
}

export function CheckExperience({
  initial,
}: {
  initial: {
    items: Array<{
      id: string;
      bucket: "rise" | "midday" | "evening";
      text: string;
      order: number;
      done: boolean;
    }>;
    day: string;
    satisfied: number | null;
  };
}) {
  const hydrate = useCheckStore((state) => state.hydrate);
  const items = useCheckStore((state) => state.items);
  const satisfied = useCheckStore((state) => state.satisfied);
  const saving = useCheckStore((state) => state.saving);
  const toggle = useCheckStore((state) => state.toggle);
  const add = useCheckStore((state) => state.add);
  const remove = useCheckStore((state) => state.remove);
  const move = useCheckStore((state) => state.move);
  const editText = useCheckStore((state) => state.editText);
  const satisfy = useCheckStore((state) => state.satisfy);
  const reset = useCheckStore((state) => state.reset);

  const [manage, setManage] = useState<Record<Bucket, boolean>>({
    rise: false,
    midday: false,
    evening: false,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({
    rise: "",
    midday: "",
    evening: "",
  });
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestingBucket, setSuggestingBucket] = useState<Bucket | null>(null);
  const [suggestions, setSuggestions] = useState<Partial<Record<Bucket, string[]>>>({});

  useEffect(() => {
    hydrate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = () => setReady(canSatisfy());
    const id = setInterval(tick, 60_000);
    const t = setTimeout(tick, 0); // fires after hydration, never during SSR
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);

  const toggleItem = (id: string) =>
    void toggle(id).catch(() => toast.error("Couldn't save"));

  const suggestForBucket = async (bucket: Bucket) => {
    if (suggestingBucket) return;
    setSuggestingBucket(bucket);
    try {
      const { items, source } = await suggestBucket(bucket);
      setSuggestions((prev) => ({ ...prev, [bucket]: items }));
      if (items.length === 0) {
        toast.info("Nothing to suggest yet");
      } else if (source === "local") {
        toast.info("AI is busy — quick picks from your own actions.");
      }
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Suggest is unavailable"));
    } finally {
      setSuggestingBucket(null);
    }
  };

  const acceptSuggestion = (bucket: Bucket, text: string) => {
    void add(bucket, text).catch(() => toast.error("Not saved"));
    setSuggestions((prev) => ({
      ...prev,
      [bucket]: (prev[bucket] ?? []).filter((item) => item !== text),
    }));
  };

  const dismissSuggestions = (bucket: Bucket) => {
    setSuggestions((prev) => ({ ...prev, [bucket]: [] }));
  };

  const toggleManage = (bucket: Bucket) => {
    if (manage[bucket]) setEditingId(null);
    setManage((prev) => ({ ...prev, [bucket]: !prev[bucket] }));
  };

  const submit = (bucket: Bucket) => async () => {
    const text = drafts[bucket].trim();
    if (!text) return;
    setDrafts((value) => ({ ...value, [bucket]: "" }));
    await add(bucket, text).catch(() => toast.error("Not saved"));
  };

  const percent = items.length
    ? Math.round((items.filter((item) => item.done).length / items.length) * 100)
    : 0;

  const endDay = async () => {
    if (items.length === 0) return;
    try {
      await satisfy(percent);
      await reset();
      toast.success(`Check: ${percent}% — cleared for tomorrow`);
    } catch {
      toast.error("Could not close the day");
    }
  };

  return (
    <main className="min-h-full w-full bg-background px-3 pb-20 pt-5 sm:px-6 sm:pt-8">
      <h1 className="sr-only">Check</h1>
        <div className="mx-auto w-full max-w-5xl md:max-w-6xl">
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {/* Buckets — three vertical strips */}
          {BUCKETS.map((bucket) => {
            const bucketItems = items
              .filter((item) => item.bucket === bucket)
              .sort((a, b) => a.order - b.order);
            const doneHere = bucketItems.filter((item) => item.done).length;
            const bucketManage = manage[bucket];
            return (
              <section
                aria-label={BUCKET_LABELS[bucket]}
                className="flex flex-col rounded-2xl border-2 border-border bg-popover p-3 sm:p-4"
                key={bucket}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-extrabold text-foreground">
                    {BUCKET_LABELS[bucket]}
                  </h2>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      aria-busy={suggestingBucket === bucket}
                      aria-label={
                        suggestingBucket === bucket
                          ? `Reading your days for ${BUCKET_LABELS[bucket]}…`
                          : `Suggest for ${BUCKET_LABELS[bucket]}`
                      }
                      className="grid size-7 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      disabled={suggestingBucket !== null}
                      onClick={() => void suggestForBucket(bucket)}
                      type="button"
                    >
                      {suggestingBucket === bucket ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      ) : (
                        <Wand aria-hidden="true" className="size-4" strokeWidth={1.8} />
                      )}
                    </button>
                    <span className="text-xs tabular-nums font-bold text-foreground">
                      {doneHere} / {bucketItems.length}
                    </span>
                    <button
                      aria-label={
                        bucketManage
                          ? `Done managing ${BUCKET_LABELS[bucket]}`
                          : `Manage ${BUCKET_LABELS[bucket]}`
                      }
                      aria-pressed={bucketManage}
                      className="grid size-7 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleManage(bucket)}
                      type="button"
                    >
                      {bucketManage ? (
                        <XIcon aria-hidden="true" className="size-4" strokeWidth={2} />
                      ) : (
                        <SlidersHorizontal
                          aria-hidden="true"
                          className="size-4"
                          strokeWidth={1.8}
                        />
                      )}
                    </button>
                  </span>
                </div>

                <ul className="mt-3 grid gap-1">
                  {bucketItems.map((item) => (
                    <li key={item.id}>
                      <TimelineRow
                        key={`${item.id}:${item.text}`}
                        editing={editingId === item.id}
                        item={item}
                        manage={bucketManage}
                        onDelete={() =>
                          void remove(item.id).catch(() => toast.error("Not deleted"))
                        }
                        onEditFinish={(nextText) => {
                          setEditingId(null);
                          if (nextText)
                            void editText(item.id, nextText).catch(() =>
                              toast.error("Couldn't save"),
                            );
                        }}
                        onEditStart={() => setEditingId(item.id)}
                        onMoveDown={() =>
                          void move(item.id, "down").catch(() =>
                            toast.error("Couldn't move"),
                          )
                        }
                        onMoveUp={() =>
                          void move(item.id, "up").catch(() =>
                            toast.error("Couldn't move"),
                          )
                        }
                        onToggle={() => toggleItem(item.id)}
                      />
                    </li>
                  ))}
                </ul>

                {suggestions[bucket] && suggestions[bucket].length > 0 && (
                  <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="type-eyebrow">Suggestions</span>
                      <button
                        aria-label="Dismiss suggestions"
                        className="grid size-5 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={() => dismissSuggestions(bucket)}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3" strokeWidth={2.2} />
                      </button>
                    </div>
                    <ul className="mt-1 grid gap-0.5">
                      {suggestions[bucket]?.map((text) => (
                        <li
                          className="flex items-center justify-between gap-1.5 py-0.5"
                          key={text}
                        >
                          <span className="min-w-0 truncate text-[11px] font-medium leading-5 text-foreground">
                            {text}
                          </span>
                          <button
                            aria-label={`Add "${text}"`}
                            className="grid size-6 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                            onClick={() => acceptSuggestion(bucket, text)}
                            type="button"
                          >
                            <Plus aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {bucketItems.length === 0 && !suggestions[bucket]?.length && !bucketManage && (
                  <p className="mt-2 py-1.5 text-xs font-medium text-foreground">
                    Nothing yet
                  </p>
                )}

                {bucketManage && (
                  <form
                    className="mt-auto flex items-center gap-1 pt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(bucket)();
                    }}
                  >
                    <input
                      aria-label={`Add to ${BUCKET_LABELS[bucket]}`}
                      className="h-8 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
                      maxLength={150}
                      onChange={(event) =>
                        setDrafts((value) => ({ ...value, [bucket]: event.target.value }))
                      }
                      placeholder="One small thing…"
                      spellCheck={false}
                      value={drafts[bucket]}
                    />
                    <button
                      aria-label="Add"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                      disabled={!drafts[bucket].trim()}
                      type="submit"
                    >
                      <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
                    </button>
                  </form>
                )}
              </section>
            );
          })}
          </div>

        {/* Single evening button — merged satisfy + reset */}
        <div className="mt-6 flex items-center justify-end">
          <button
            aria-label={
              satisfied !== null
                ? `Best day, ${satisfied} percent`
                : `End of day, ${percent} percent done`
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-extrabold text-background outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            disabled={!ready || items.length === 0 || saving || satisfied !== null}
            onClick={() => void endDay()}
            title={ready ? undefined : "Available after 6pm"}
            type="button"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <ProgressRing percent={satisfied ?? percent} />
            )}
            {satisfied !== null ? "Best" : "Done"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function TimelineRow({
  item,
  manage,
  editing,
  onToggle,
  onEditStart,
  onEditFinish,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  item: TimelineItem;
  manage: boolean;
  editing: boolean;
  onToggle: () => void;
  onEditStart: () => void;
  onEditFinish: (text: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

  if (editing) {
    return (
      <div className="flex min-h-10 items-center gap-2 py-1.5">
        <input
          aria-label="Edit item"
          className="h-7 min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none"
          maxLength={150}
          onBlur={() => onEditFinish(draft.trim())}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEditFinish(draft.trim());
            if (event.key === "Escape") onEditFinish("");
          }}
          ref={inputRef}
          value={draft}
        />
        <button
          aria-label="Save"
          className="grid size-6 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
          onMouseDown={(event) => {
            // Save on mousedown so onBlur doesn't race before we finish.
            event.preventDefault();
            onEditFinish(draft.trim());
          }}
          type="button"
        >
          <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex min-h-10 items-start gap-2.5 py-1.5">
      <button
        aria-pressed={item.done}
        aria-label={item.done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground bg-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          item.done && "bg-foreground text-background",
        )}
        onClick={onToggle}
        type="button"
      >
        {item.done && (
          <Check aria-hidden="true" className="size-3 text-background" strokeWidth={3.5} />
        )}
      </button>
      <button
        className="min-w-0 flex-1 break-words text-left text-[14px] font-semibold leading-7 text-foreground outline-none transition-opacity focus-visible:opacity-100"
        onClick={() => (manage ? onEditStart() : onToggle())}
        onDoubleClick={() => onEditStart()}
        type="button"
      >
        <span>{item.text}</span>
      </button>
      {manage && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            aria-label="Move up"
            className="grid size-6 place-items-center rounded-full text-foreground/60 outline-none transition hover:bg-muted hover:text-foreground"
            onClick={onMoveUp}
            type="button"
          >
            <ArrowUp aria-hidden="true" className="size-3" strokeWidth={2.2} />
          </button>
          <button
            aria-label="Move down"
            className="grid size-6 place-items-center rounded-full text-foreground/60 outline-none transition hover:bg-muted hover:text-foreground"
            onClick={onMoveDown}
            type="button"
          >
            <ArrowDown aria-hidden="true" className="size-3" strokeWidth={2.2} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              aria-label="Delete item"
              className="grid size-6 place-items-center rounded-full text-foreground/60 outline-none transition hover:bg-muted hover:text-destructive"
            >
              <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5">
                {`“${item.text}” will be removed.`}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}


