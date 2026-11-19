"use client";

import {
  GripVertical,
  LoaderCircle,
  Plus,
  SlidersHorizontal,
  Wand,
  X as XIcon,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BUCKET_LABELS } from "@/features/check/types";
import type { Bucket, TimelineItem } from "@/features/check/types";
import { TimelineRow } from "@/components/features/check/timeline-row";
import { SuggestionsPanel } from "@/components/features/check/suggestions-panel";
import { GratitudeLine } from "@/components/features/check/gratitude-line";
import { useCheckStore } from "@/features/check/store";
import { suggestBucket } from "@/features/ai/client-api";
import { getApiErrorMessage } from "@/lib/api-client";

type DragState = {
  id: string;
  text: string;
  grabOffsetY: number;
  clientY: number;
  insertIndex: number;
  left: number;
  width: number;
  height: number;
};

export function BucketCard({ bucket }: { bucket: Bucket }) {
  const items = useCheckStore((state) => state.items);
  const today = useCheckStore((state) => state.day);
  const manage = useCheckStore((state) => state.manage[bucket]);
  const draft = useCheckStore((state) => state.drafts[bucket]);
  const editingId = useCheckStore((state) => state.editingId);
  const suggestions = useCheckStore((state) => state.suggestions[bucket]);
  const suggestingBucket = useCheckStore((state) => state.suggestingBucket);
  const setDraft = useCheckStore((state) => state.setDraft);
  const clearDraft = useCheckStore((state) => state.clearDraft);
  const toggleManage = useCheckStore((state) => state.toggleManage);
  const setSuggestingBucket = useCheckStore((state) => state.setSuggestingBucket);
  const setSuggestions = useCheckStore((state) => state.setSuggestions);
  const add = useCheckStore((state) => state.add);
  const move = useCheckStore((state) => state.move);
  const reorder = useCheckStore((state) => state.reorder);

  const bucketItems = items
    .filter((item) => item.bucket === bucket)
    .sort((a, b) => a.order - b.order);

  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const itemsRef = useRef(bucketItems);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    itemsRef.current = bucketItems;
  });

  // Mirror the drag through a ref so window listeners read the latest state
  // without smuggling store writes through a setState updater (which React
  // may run during render).
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const setRowRef = (id: string) => (element: HTMLLIElement | null) => {
    if (element) rowRefs.current.set(id, element);
    else rowRefs.current.delete(id);
  };

  const doneHere = bucketItems.filter((item) => item.done).length;
  const label = BUCKET_LABELS[bucket];
  const suggesting = suggestingBucket === bucket;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    clearDraft(bucket);
    void add(bucket, text).catch(() => toast.error("Not saved"));
  };

  const suggestForBucket = async () => {
    if (suggestingBucket) return;
    setSuggestingBucket(bucket);
    try {
      const { items: picked, source } = await suggestBucket(bucket);
      setSuggestions((prev) => ({ ...prev, [bucket]: picked }));
      if (picked.length === 0) {
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

  const acceptSuggestion = (text: string) => {
    void add(bucket, text).catch(() => toast.error("Not saved"));
    setSuggestions((prev) => ({
      ...prev,
      [bucket]: (prev[bucket] ?? []).filter((item) => item !== text),
    }));
  };

  const dismissSuggestions = () => {
    setSuggestions((prev) => ({ ...prev, [bucket]: [] }));
  };

  const beginDrag = (item: TimelineItem, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!manage || editingId) return;
    const row = rowRefs.current.get(item.id);
    if (!row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    setDrag({
      id: item.id,
      text: item.text,
      grabOffsetY: event.clientY - rect.top,
      clientY: event.clientY,
      insertIndex: bucketItems.findIndex((entry) => entry.id === item.id),
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  };

  const gripKeyDown = (item: TimelineItem) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    void move(item.id, event.key === "ArrowUp" ? "up" : "down").catch(() => toast.error("Couldn't move"));
  };

  // Window-level listeners drive the drag; placeholder sits between the rows.
  const dragActive = drag !== null;
  useEffect(() => {
    if (!dragActive) return;

    const computeInsertIndex = (clientY: number): number => {
      const draggedId = dragRef.current?.id;
      if (!draggedId) return 0;
      const slots = itemsRef.current.filter((item) => item.id !== draggedId);
      for (let index = 0; index < slots.length; index += 1) {
        const row = rowRefs.current.get(slots[index].id);
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return index;
      }
      return slots.length;
    };

    const onMove = (event: PointerEvent) => {
      // Keep the page scrolling under the pointer inside the list bounds.
      if (event.clientY < 64) window.scrollBy(0, -14);
      else if (event.clientY > window.innerHeight - 64) window.scrollBy(0, 14);
      const current = dragRef.current;
      if (!current) return;
      setDrag({
        ...current,
        clientY: event.clientY,
        insertIndex: computeInsertIndex(event.clientY),
      });
    };

    const onUp = () => {
      const current = dragRef.current;
      if (!current) return;
      const currentIds = itemsRef.current.map((item) => item.id);
      const slots = itemsRef.current
        .filter((item) => item.id !== current.id)
        .map((item) => item.id);
      const ids = [
        ...slots.slice(0, current.insertIndex),
        current.id,
        ...slots.slice(current.insertIndex),
      ];
      setDrag(null);
      if (ids.join("|") !== currentIds.join("|")) {
        void reorder(bucket, ids).catch(() => toast.error("Couldn't save order"));
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [dragActive, bucket, reorder]);

  const slots = drag ? bucketItems.filter((item) => item.id !== drag.id) : bucketItems;

  return (
    <section
      aria-label={label}
      className="relative flex h-full flex-col rounded-2xl border-2 border-border bg-popover p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-foreground">{label}</h2>
        <span className="flex shrink-0 items-center gap-1.5">
          <Button
            aria-busy={suggesting}
            aria-label={
              suggesting
                ? `Reading your days for ${label}…`
                : `Suggest for ${label}`
            }
            className="size-7 rounded-full focus-visible:ring-2"
            disabled={suggestingBucket !== null}
            onClick={() => void suggestForBucket()}
            size="icon"
            type="button"
            variant="ghost"
          >
            {suggesting ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Wand aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
          </Button>
          <span className="text-xs tabular-nums font-bold text-foreground">
            {doneHere} / {bucketItems.length}
          </span>
          <Button
            aria-label={manage ? `Done managing ${label}` : `Manage ${label}`}
            aria-pressed={manage}
            className="size-7 rounded-full focus-visible:ring-2"
            onClick={() => toggleManage(bucket)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {manage ? (
              <XIcon aria-hidden="true" className="size-4" strokeWidth={2} />
            ) : (
              <SlidersHorizontal
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.8}
              />
            )}
          </Button>
        </span>
      </div>

      <ul className="mt-3 flex-1 content-start grid gap-1">
        {slots.flatMap((item, index) => {
          const rows = [];
          if (drag && drag.insertIndex === index) {
            rows.push(
              <li
                aria-hidden="true"
                className="rounded-xl border-2 border-dashed border-foreground/35 bg-muted/40"
                key="__drop__"
                style={{ height: drag.height }}
              />,
            );
          }
          rows.push(
            <li key={item.id} ref={setRowRef(item.id)}>
              <TimelineRow
                item={item}
                onGripKeyDown={gripKeyDown(item)}
                onGripPointerDown={(event) => beginDrag(item, event)}
              />
            </li>,
          );
          return rows;
        })}
        {drag && drag.insertIndex === slots.length ? (
          <li
            aria-hidden="true"
            className="rounded-xl border-2 border-dashed border-foreground/35 bg-muted/40"
            style={{ height: drag.height }}
          />
        ) : null}
      </ul>

      {suggestions && suggestions.length > 0 && (
        <SuggestionsPanel
          onAccept={acceptSuggestion}
          onDismiss={dismissSuggestions}
          suggestions={suggestions}
        />
      )}

      {bucketItems.length === 0 && !suggestions?.length && !manage && (
        <p className="mt-2 py-1.5 text-xs font-medium text-foreground">Nothing yet</p>
      )}

      {bucket === "evening" && today && <GratitudeLine day={today} />}

      {manage && (
        <form className="mt-auto flex items-center gap-1 pt-2" onSubmit={submit}>
          <Input
            aria-label={`Add to ${label}`}
            className="h-8 border-0 bg-transparent px-0 text-sm placeholder:text-foreground/40 focus-visible:border-transparent focus-visible:ring-0 md:text-sm"
            maxLength={150}
            onChange={(event) => setDraft(bucket, event.target.value)}
            placeholder={bucket === "rise" ? "when X, I will Y…" : "One small thing…"}
            spellCheck={false}
            value={draft}
          />
          <Button
            aria-label="Add"
            className="size-8 rounded-full disabled:opacity-30"
            disabled={!draft.trim()}
            type="submit"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
          </Button>
        </form>
      )}

      {/* Floating drag clone — the "lift" effect, deliberately not the browser's. */}
      {drag ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 flex rotate-[1.3deg] items-center gap-2 rounded-xl border-2 border-foreground bg-popover px-3 py-2.5 shadow-xl shadow-foreground/15"
          style={{
            left: drag.left,
            top: drag.clientY - drag.grabOffsetY,
            width: drag.width,
            height: drag.height,
          }}
        >
          <GripVertical aria-hidden="true" className="size-4 shrink-0 text-foreground/60" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-6 text-foreground">
            {drag.text}
          </span>
        </div>
      ) : null}
    </section>
  );
}
