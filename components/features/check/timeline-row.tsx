"use client";

import {
  Check,
  GripVertical,
  PenLine,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckStore } from "@/features/check/store";
import type { TimelineItem } from "@/features/check/types";

export function TimelineRow({
  item,
  onGripPointerDown,
  onGripKeyDown,
}: {
  item: TimelineItem;
  /** Grip pressed — the parent owns the drag session. */
  onGripPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  /** Arrow keys on the grip — keyboard reorder. */
  onGripKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const manage = useCheckStore((state) => state.manage[item.bucket]);
  const editing = useCheckStore((state) => state.editingId === item.id);
  const setEditingId = useCheckStore((state) => state.setEditingId);
  const toggle = useCheckStore((state) => state.toggle);
  const remove = useCheckStore((state) => state.remove);
  const editText = useCheckStore((state) => state.editText);

  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

  const finishEdit = (next: string) => {
    setEditingId(null);
    const text = next.trim();
    if (!text || text === item.text) return;
    void editText(item.id, text).catch(() => toast.error("Couldn't save"));
  };

  if (editing) {
    return (
      <div className="flex min-h-10 items-center gap-2 py-1.5">
        <Input
          aria-label="Edit item"
          className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-[14px] focus-visible:border-transparent focus-visible:ring-0 md:text-[14px]"
          maxLength={150}
          onBlur={() => finishEdit(draft)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") finishEdit(draft);
            if (event.key === "Escape") setEditingId(null);
          }}
          ref={inputRef}
          value={draft}
        />
        <Button
          aria-label="Save"
          className="size-6 rounded-full focus-visible:ring-1"
          onMouseDown={(event) => {
            // Save on mousedown so onBlur doesn't race before we finish.
            event.preventDefault();
            finishEdit(draft);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        </Button>
      </div>
    );
  }

  if (manage) {
    // Manage: grip · label (tap = edit) · pencil · trash. No checkbox.
    return (
      <div className="flex min-h-10 items-center gap-1 py-1">
        <Button
          aria-keyshortcuts="ArrowUp ArrowDown"
          aria-label={`Reorder ${item.text}. Use arrow keys or drag.`}
          className="size-7 shrink-0 cursor-grab touch-none rounded-md text-foreground/55 hover:bg-muted hover:text-foreground active:cursor-grabbing"
          onKeyDown={onGripKeyDown}
          onPointerDown={onGripPointerDown}
          size="icon"
          type="button"
          variant="ghost"
        >
          <GripVertical aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
        <Button
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal break-words px-1 py-0 text-left text-[14px] font-semibold leading-6 text-foreground hover:bg-muted/50"
          onClick={() => setEditingId(item.id)}
          type="button"
          variant="ghost"
        >
          <span>{item.text}</span>
        </Button>
        <PenLine
          aria-hidden="true"
          className="size-3.5 shrink-0 text-foreground/35"
          strokeWidth={1.8}
        />
        <AlertDialog>
          <AlertDialogTrigger
            aria-label={`Delete ${item.text}`}
            className="grid size-6 shrink-0 place-items-center rounded-full text-foreground/60 outline-none transition hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
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
              <AlertDialogAction onClick={() => void remove(item.id).catch(() => toast.error("Not deleted"))}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // View: checkbox toggles the item. Text toggles too.
  return (
    <div className="group flex min-h-10 items-start gap-2.5 py-1">
      <Checkbox
        aria-label={item.done ? "Mark not done" : "Mark done"}
        checked={item.done}
        className="mt-0 size-6 rounded-full border-foreground"
        onCheckedChange={() => void toggle(item.id).catch(() => toast.error("Couldn't save"))}
      />
      <Button
        className="h-auto min-w-0 flex-1 justify-start whitespace-normal break-words px-1 py-0 text-left text-[14px] font-semibold leading-6 text-foreground hover:bg-muted/50"
        onClick={() => void toggle(item.id).catch(() => toast.error("Couldn't save"))}
        type="button"
        variant="ghost"
      >
        <span>{item.text}</span>
      </Button>
    </div>
  );
}
