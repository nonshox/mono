"use client";

import { Check, LoaderCircle, Plus, Trash2, ArrowUp, ArrowDown, SlidersHorizontal, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useTodayStore,
} from "@/features/today/store";
import { BUCKET_LABELS } from "@/features/today/types";
import type { TimelineItem, Bucket } from "@/features/today/types";
import { cn } from "cn";

const BUCKETS = ["rise", "midday", "evening"] as const;

// Satisfaction is an evening practice only — before 6pm the button stays disabled.
const SATISFY_AFTER_HOUR = 18;

function canSatisfy(): boolean {
  return new Date().getHours() >= SATISFY_AFTER_HOUR;
}

export function TodayExperience({
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
  const hydrate = useTodayStore((state) => state.hydrate);
  const items = useTodayStore((state) => state.items);
  const satisfied = useTodayStore((state) => state.satisfied);
  const saving = useTodayStore((state) => state.saving);
  const toggle = useTodayStore((state) => state.toggle);
  const add = useTodayStore((state) => state.add);
  const remove = useTodayStore((state) => state.remove);
  const move = useTodayStore((state) => state.move);
  const editText = useTodayStore((state) => state.editText);
  const satisfy = useTodayStore((state) => state.satisfy);
  const reset = useTodayStore((state) => state.reset);

  const [manage, setManage] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({
    rise: "",
    midday: "",
    evening: "",
  });
  const [ready, setReady] = useState(() => canSatisfy());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    hydrate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setReady(canSatisfy()), 60_000);
    return () => clearInterval(id);
  }, []);

  const toggleItem = (id: string) =>
    void toggle(id).catch(() => toast.error("Couldn't save"));

  const submit = (bucket: Bucket) => async () => {
    const text = drafts[bucket].trim();
    if (!text) return;
    setDrafts((value) => ({ ...value, [bucket]: "" }));
    await add(bucket, text).catch(() => toast.error("Not saved"));
  };

  const endDay = async () => {
    const total = items.length;
    if (total === 0) return;
    const percent = Math.round(
      (items.filter((item) => item.done).length / total) * 100,
    );
    try {
      await satisfy(percent);
      await reset();
      toast.success(`Today: ${percent}% — cleared for tomorrow`);
    } catch {
      toast.error("Could not close the day");
    }
  };

  return (
    <main className="min-h-full w-full bg-background px-3 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-5xl md:max-w-6xl">
        {/* Top row — manage toggle only, tiny */}
        <div className="flex items-center justify-end pb-2">
          <button
            aria-label={manage ? "Done managing" : "Manage items"}
            aria-pressed={manage}
            className="grid size-7 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setManage((prev) => !prev)}
            type="button"
          >
            {manage ? (
              <XIcon aria-hidden="true" className="size-4" strokeWidth={2} />
            ) : (
              <SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Buckets — three vertical strips, big boxes, no stretched heights */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {BUCKETS.map((bucket) => {
            const bucketItems = items
              .filter((item) => item.bucket === bucket)
              .sort((a, b) => a.order - b.order);
            const doneHere = bucketItems.filter((item) => item.done).length;
            return (
              <section
                aria-label={BUCKET_LABELS[bucket]}
                className="flex flex-col rounded-2xl border-2 border-border bg-popover p-3 sm:p-4"
                key={bucket}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-base font-extrabold text-foreground">
                    {BUCKET_LABELS[bucket]}
                  </h2>
                  <span className="text-xs tabular-nums font-bold text-foreground">
                    {doneHere} / {bucketItems.length}
                  </span>
                </div>

                <ul className="mt-3 grid gap-1">
                  {bucketItems.map((item) => (
                    <li key={item.id}>
                      <TimelineRow
                        key={`${item.id}:${item.text}`}
                        editing={editingId === item.id}
                        item={item}
                        manage={manage}
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
              </section>
            );
          })}
        </div>

        {/* Single evening button — merged satisfy + reset */}
        <div className="mt-6 flex items-center justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-xs font-extrabold text-background outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            disabled={!ready || items.length === 0 || saving}
            onClick={() => void endDay()}
            title={ready ? undefined : "Available after 6pm"}
            type="button"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
            )}
            {satisfied !== null ? `Best day: ${satisfied}%` : `End of day · ${
              items.length
                ? Math.round((items.filter((item) => item.done).length / items.length) * 100)
                : 0
            }%`}
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
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-foreground bg-background outline-none transition focus-visible:ring-1 focus-visible:ring-ring",
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
          <button
            aria-label="Delete item"
            className="grid size-6 place-items-center rounded-full text-foreground/60 outline-none transition hover:bg-muted hover:text-destructive"
            onClick={onDelete}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}
