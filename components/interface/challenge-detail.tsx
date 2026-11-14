"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChallengeDetail } from "@/features/challenges/types";
import { toggleChallenge } from "@/features/challenges/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { UserAvatar } from "@/components/interface/user-avatar";
import {
  ArrowLeft,
  LoaderCircle,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const percent = Math.min(
    100,
    Math.round((initial.myReps / Math.max(1, initial.reps)) * 100),
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
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
      {/* Back */}
      <Link
        aria-label="All challenges"
        className="inline-flex h-9 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground outline-none transition hover:text-foreground"
        href="/challenges"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
        Challenges
      </Link>

      {/* Title */}
      <header className="mt-3 border-b border-border/60 pb-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-primary">
          Ends {endsAt(initial.ends)}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {initial.title}
        </h1>
        <p className="mt-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          {initial.window === "week" ? "This week's round" : "Limited round"} · Camera-verified reps
        </p>
      </header>

      {/* Standing */}
      <section aria-label="Your standing" className="border-b border-border/60 py-4 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Your progress
            </p>
            <p className="mt-1.5 text-4xl font-semibold tabular-nums leading-none tracking-tight text-foreground sm:text-5xl">
              {initial.myReps}
              <span className="text-base font-medium text-muted-foreground sm:text-lg">
                {" "}/ {initial.reps}
              </span>
            </p>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium sm:text-[11px]">
              <Users aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              {initial.memberCount} joined
            </p>
            {joined && (
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
                You&apos;re in
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <button
          className="mt-3.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[11px] font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:w-auto sm:px-8"
          disabled={busy}
          onClick={() => void toggle()}
          type="button"
        >
          {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {joined ? "Leave challenge" : "Join challenge"}
        </button>
        {error && (
          <p className="mt-2 text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* Rankings */}
      {initial.leaderboard.length > 0 && (
        <section aria-label="Leaderboard" className="mt-5">
          <h2 className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Leaderboard
          </h2>
          <ol className="divide-y divide-border/60 border-y border-border/60">
            {initial.leaderboard.map((entry) => (
              <li
                className={`flex h-11 items-center gap-2.5 ${
                  entry.isYou ? "bg-muted/40" : ""
                }`}
                key={entry.userId}
              >
                <span
                  className={`grid w-6 shrink-0 place-items-center text-[11px] tabular-nums ${
                    entry.rank <= 3
                      ? "font-bold text-foreground"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  {entry.rank}
                </span>
                <UserAvatar avatar={entry.avatar} name={entry.name} size={24} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground sm:text-xs">
                  {entry.name}
                  {entry.isYou && (
                    <span className="ml-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-primary">
                      you
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                  {entry.reps.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
