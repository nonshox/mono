"use client";

import { Brain as BrainIcon, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useBrainStore } from "@/features/brain/store";
import type { BrainTask } from "@/features/brain/client-api";
import { useUserStore } from "@/features/users/store";
import { getApiErrorMessage } from "@/lib/api-client";
import { MicButton } from "@/components/interface/mic-button";
import { cn } from "cn";

export function BrainExperience({
  initialTasks,
}: {
  initialTasks: BrainTask[];
}) {
  const hydrate = useBrainStore((state) => state.hydrate);
  const load = useBrainStore((state) => state.load);
  const tasks = useBrainStore((state) => state.tasks);
  const loaded = useBrainStore((state) => state.loaded);
  const saving = useBrainStore((state) => state.saving);
  const add = useBrainStore((state) => state.add);
  const toggle = useBrainStore((state) => state.toggle);
  const remove = useBrainStore((state) => state.remove);
  const tidy = useBrainStore((state) => state.tidy);
  const aiOn = useUserStore((state) => state.user?.ai ?? false);

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hydrate(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) void load().catch(() => toast.error("Brain unavailable"));
  }, [loaded, load]);

  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;
    setDraft("");
    try {
      await add(text);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Thought not saved"));
      setDraft(text); // restore the words — don't lose them
    }
    inputRef.current?.focus();
  };

  const toggleTask = async (id: string) => {
    try {
      await toggle(id);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Task not updated"));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await remove(id);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Task not deleted"));
    }
  };

  const runTidy = async () => {
    if (!aiOn) {
      toast.message("Enable Mono AI to tidy");
      return;
    }
    if (open.length < 2) {
      toast.message("Add a few more first");
      return;
    }
    const pending = toast.loading("Tidying…");
    try {
      await tidy();
      toast.success("Tidied", { id: pending });
    } catch (cause) {
      toast.error(
        getApiErrorMessage(cause, "Tidy failed"),
        { id: pending },
      );
    }
  };

  if (!loaded) {
    return (
      <main className="grid min-h-full place-items-center bg-background px-4 pb-20">
        <LoaderCircle aria-label="Loading brain" className="size-5 animate-spin text-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-full w-full bg-background px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between py-1.5">
          <h1 className="type-label text-foreground">Brain</h1>
          <button
            aria-busy={saving}
            aria-label="Tidy with Mono AI"
            className="grid size-7 place-items-center rounded-full border border-border text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            disabled={saving || open.length < 2}
            onClick={() => void runTidy()}
            title={aiOn ? "Tidy — dedupe & tighten" : "Mono AI is off — enable it in Settings"}
            type="button"
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Capture */}
        <form
          className="mt-3 flex items-center gap-2 py-1"
          onSubmit={(event) => void submit(event)}
        >
          <Plus aria-hidden="true" className="size-4 shrink-0 text-foreground/50" strokeWidth={2} />
          <input
            aria-label="Add to brain"
            autoFocus
            className="h-8 w-full bg-transparent text-base text-foreground outline-none placeholder:text-foreground/40 md:text-sm"
            maxLength={300}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What's next…"
            ref={inputRef}
            spellCheck={false}
            value={draft}
          />
          <MicButton onChange={setDraft} value={draft} />
          <button
            aria-label="Add"
            className="grid size-7 shrink-0 place-items-center rounded-full border border-border outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            disabled={!draft.trim() || saving}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
          </button>
        </form>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="grid justify-items-center gap-3 pt-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground/60">
              <BrainIcon aria-hidden="true" className="size-6" strokeWidth={1.5} />
            </span>
            <p className="text-sm font-semibold text-foreground">An empty brain</p>
            <p className="max-w-xs text-xs leading-5 text-foreground/70">
              Type one thing you need to do — it&apos;ll live here until you check it off.
            </p>
          </div>
        )}

        {open.length > 0 && (
          <section aria-label="Open tasks" className="mt-5">
            <div className="flex items-center justify-between pb-1">
              <h2 className="type-label text-foreground/60">Open</h2>
              <span className="text-xs tabular-nums text-foreground/50">{open.length}</span>
            </div>
            <ul>
              {open.map((task) => (
                <li key={task.id}>
                  <TaskRow
                    saving={saving}
                    task={task}
                    onDelete={() => void deleteTask(task.id)}
                    onToggle={() => void toggleTask(task.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Done pile */}
        {done.length > 0 && (
          <section aria-label="Done" className="mt-6">
            <div className="flex items-center justify-between pb-1">
              <h2 className="type-label text-foreground/40">Done</h2>
              <span className="text-xs tabular-nums text-foreground/40">{done.length}</span>
            </div>
            <ul>
              {done.map((task) => (
                <li key={task.id}>
                  <TaskRow
                    done
                    saving={saving}
                    task={task}
                    onDelete={() => void deleteTask(task.id)}
                    onToggle={() => void toggleTask(task.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function TaskRow({
  task,
  done = false,
  saving,
  onToggle,
  onDelete,
}: {
  task: BrainTask;
  done?: boolean;
  saving: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex min-h-10 items-start gap-3 py-2 transition-opacity",
        done && "opacity-40",
      )}
    >
      <button
        aria-pressed={done}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-[3px] grid size-5 shrink-0 place-items-center rounded-full border-2 border-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          done ? "bg-foreground text-background" : "bg-transparent",
        )}
        onClick={onToggle}
        type="button"
      >
        {done && (
          <svg aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12">
            <path d="M2 6.5 5 9.5 10 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <p
        className={cn(
          "flex-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground",
          done && "line-through decoration-foreground/30",
        )}
      >
        {task.text}
      </p>
      <button
        aria-label="Delete task"
        className="grid size-6 shrink-0 place-items-center rounded-full text-foreground/40 opacity-0 outline-none transition hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        disabled={saving}
        onClick={onDelete}
        type="button"
      >
        <X aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
