import { ArrowRight, Check, Dumbbell, Lock, ShieldCheck, Users } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentAccount } from "@/features/auth/session";
import {
  getActiveChallenges,
  getChallengeDetail,
  getJoinedChallengeIds,
} from "@/features/challenges/service";
import { getWorkoutSummary } from "@/features/workouts/service";
import { MILESTONES } from "@/lib/achievements";
import type { ChallengeDetail } from "@/features/challenges/types";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { EmptyState } from "@/components/interface/empty-state";

export const metadata = {
  title: "Challenges",
};

export default function ChallengesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedChallenges />
    </Suspense>
  );
}

async function AuthenticatedChallenges() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const [challenges, joinedIds, summary] = await Promise.all([
    getActiveChallenges(),
    getJoinedChallengeIds(account.$id),
    getWorkoutSummary(account.$id).catch(() => null),
  ]);
  const totalReps = summary?.totalReps ?? 0;

  const QUEST_TARGETS: Array<{ id: string; target: number }> = [
    { id: "first-20", target: 20 },
    { id: "first-50", target: 50 },
    { id: "first-100", target: 100 },
    { id: "first-250", target: 250 },
    { id: "first-500", target: 500 },
    { id: "first-1000", target: 1000 },
    { id: "first-streak", target: 3 },
  ];
  const quests = MILESTONES.filter((m) => QUEST_TARGETS.some((q) => q.id === m.id)).map(
    (m) => {
      const target = QUEST_TARGETS.find((q) => q.id === m.id)!.target;
      const current =
        m.id === "first-streak" ? Math.min(summary?.streak ?? 0, target) : Math.min(totalReps, target);
      return { id: m.id, title: m.title, target, current, done: current >= target };
    },
  );

  const details = await Promise.all(
    challenges.map((challenge) => getChallengeDetail(challenge.id, account.$id)),
  );
  const detailMap = new Map<string, ChallengeDetail>();
  for (const detail of details) {
    if (detail) detailMap.set(detail.id, detail);
  }

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="flex items-end justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Challenges
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Camera-verified reps · prestige only
            </p>
          </div>
          <Link
            className="shrink-0 text-[11px] font-semibold text-primary outline-none transition hover:underline"
            href="/leaderboard"
          >
            Global rankings →
          </Link>
        </header>

        {/* Quests — the personal ladder */}
        <section aria-label="Quests" className="mb-6">
          <h2 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Quests
          </h2>
          <ul className="divide-y divide-border/60 border-y border-border/60">
            {quests.map((quest) => (
              <li className="flex items-center gap-3 py-2.5" key={quest.id}>
                {quest.done ? (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={2.6} />
                ) : (
                  <Lock aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/50" strokeWidth={2} />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[11px] sm:text-xs ${
                      quest.done ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {quest.title}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-muted-foreground/70">
                    {quest.id === "first-streak" ? "3-day streak" : `${quest.target} total push-ups`}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {quest.done ? "Done" : `${quest.target - quest.current} to go`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Community rounds */}
        <h2 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Community
        </h2>

        {challenges.length === 0 ? (
          <div className="border-b border-border/60 py-10">
            <EmptyState
              description="Rounds open every week. One winner."
              icon={Dumbbell}
              title="Nothing running"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60 border-b border-border/60">
            {challenges.map((challenge) => {
              const detail = detailMap.get(challenge.id) ?? null;
              const joined = joinedIds.has(challenge.id);
              const memberCount = detail?.memberCount ?? 0;
              const myReps = detail?.myReps ?? 0;
              const percent = Math.min(
                100,
                Math.round((myReps / Math.max(1, challenge.reps)) * 100),
              );

              return (
                <li
                  className="flex items-center gap-3 py-3 sm:gap-4 sm:py-4"
                  key={challenge.id}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xs font-semibold leading-4 text-foreground sm:text-sm">
                      {challenge.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-medium text-muted-foreground">
                      <span>
                        Ends{" "}
                        {new Date(challenge.ends).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="tabular-nums">{challenge.reps.toLocaleString()} reps</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users aria-hidden="true" className="size-3" strokeWidth={2} />
                        {memberCount}
                      </span>
                    </p>
                    {joined && (
                      <div className="mt-1.5 flex max-w-sm items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-muted-foreground">
                          <span className="text-primary">{myReps}</span>/{challenge.reps}
                        </span>
                      </div>
                    )}
                  </div>
                  <Link
                    aria-label={joined ? "View challenge" : "Join challenge"}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3.5 text-[10px] font-semibold text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/challenges/${challenge.id}`}
                  >
                    <ShieldCheck aria-hidden="true" className="size-3.5" strokeWidth={2} />
                    {joined ? "View" : "Join"}
                    <ArrowRight aria-hidden="true" className="size-3" strokeWidth={2} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
