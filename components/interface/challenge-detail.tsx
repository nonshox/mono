"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChallengeDetail } from "@/features/challenges/types";
import { toggleChallenge } from "@/features/challenges/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/interface/user-avatar";
import {
  ArrowLeft,
  Dumbbell,
  Trophy,
  Users,
} from "lucide-react";

const endsAt = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export function ChallengeDetailBody({
  initial,
}: {
  challengeId: string;
  initial: ChallengeDetail;
}) {
  const [joined, setJoined] = useState(initial.joined);
  const [myReps] = useState(initial.myReps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const percent = Math.min(
    100,
    Math.round((myReps / initial.reps) * 100),
  );

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const next = !joined;
    setJoined(next);
    try {
      const serverJoined = await toggleChallenge(initial.id, next);
      setJoined(serverJoined);
    } catch (cause) {
      setJoined(!next);
      setError(
        getApiErrorMessage(cause, "Couldn't update — try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        className="inline-flex h-9 items-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground outline-none transition hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        href="/challenges"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
        Challenges
      </Link>

      <div className="surface-card mt-4 flex items-start gap-4 p-5 sm:p-6">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Dumbbell aria-hidden="true" className="size-7" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="type-eyebrow text-primary">Ends {endsAt(initial.ends)}</p>
          <h1 className="type-section mt-1">{initial.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {initial.window === "week" ? "This week's round — camera-verified reps only." : "Limited round."}
          </p>
        </div>
      </div>

      <div className="surface-card mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="type-eyebrow">Your progress</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none">
              {myReps}
              <span className="text-lg font-bold text-muted-foreground"> / {initial.reps}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
              <Users aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              {initial.memberCount} joined
            </p>
            {joined && (
              <p className="mt-1 text-[11px] font-semibold text-primary">
                You&apos;re in — good luck
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button
            className="h-11 flex-1 rounded-xl"
            disabled={busy}
            onClick={() => void toggle()}
            type="button"
            variant={joined ? "outline" : "default"}
          >
            {busy ? (
              "Saving…"
            ) : joined ? (
              "Leave challenge"
            ) : (
              "Join challenge"
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <section aria-label="Leaderboard" className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="type-eyebrow">Leaderboard</h2>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Trophy aria-hidden="true" className="size-3" strokeWidth={1.8} />
            Weekly
          </span>
        </div>
        <div className="surface-card divide-y divide-border/60 overflow-hidden">
          {initial.leaderboard.map((entry) => (
            <div
              className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${entry.isYou ? "bg-primary/5" : ""}`}
              key={entry.userId}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums ${
                  entry.rank === 1
                    ? "bg-amber-400 text-black"
                    : entry.rank === 2
                      ? "bg-zinc-300 text-black"
                      : entry.rank === 3
                        ? "bg-amber-700 text-white"
                        : "text-muted-foreground"
                }`}
              >
                {entry.rank}
              </span>
              <UserAvatar avatar={entry.avatar} name={entry.name} size={32} />
              <p className="min-w-0 flex-1 truncate text-xs font-semibold">
                {entry.name}
                {entry.isYou && (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    you
                  </span>
                )}
              </p>
              <p className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                {entry.reps.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        {initial.leaderboard.length === 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Be the first — train and show up on the board.
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
        Only reps counted from the in-app camera sessions count here.
        <br />
        Joining is free — prestige only. No money, no stakes, ever.
      </p>
    </div>
  );
}
