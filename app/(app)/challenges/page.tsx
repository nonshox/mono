import { Dumbbell, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentAccount } from "@/features/auth/session";
import {
  getActiveChallenges,
  getChallengeDetail,
  getJoinedChallengeIds,
} from "@/features/challenges/service";
import type { ChallengeDetail } from "@/features/challenges/types";
import { ChallengeSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { EmptyState } from "@/components/interface/empty-state";

export const metadata = {
  title: "Challenges",
};

export default function ChallengesPage() {
  return (
    <Suspense fallback={<ChallengeSkeleton />}>
      <AuthenticatedChallenges />
    </Suspense>
  );
}

async function AuthenticatedChallenges() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const [challenges, joinedIds] = await Promise.all([
    getActiveChallenges(),
    getJoinedChallengeIds(account.$id),
  ]);

  const details = await Promise.all(
    challenges.map((challenge) => getChallengeDetail(challenge.id, account.$id)),
  );
  const detailMap = new Map<string, ChallengeDetail>();
  for (const detail of details) {
    if (detail) detailMap.set(detail.id, detail);
  }

  return (
    <main className="w-full px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8 lg:px-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="type-eyebrow text-primary">Mono Performance</p>
          <h1 className="type-section mt-1">Challenges</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Camera-verified. One winner takes the round.
          </p>
        </div>
        <Link
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 text-xs font-semibold outline-none transition hover:border-border hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          href="/pushups"
        >
          <Dumbbell aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Train
        </Link>
      </header>

      {challenges.length === 0 ? (
        <EmptyState
          description="New rounds appear here every Monday."
          icon={Dumbbell}
          title="No active challenges"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {challenges.map((challenge) => {
            const detail = detailMap.get(challenge.id) ?? null;
            const joined = joinedIds.has(challenge.id);
            const memberCount = detail?.memberCount ?? 0;
            const myReps = detail?.myReps ?? 0;

            return (
              <li
                className="surface-card flex h-full flex-col p-5"
                key={challenge.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Ends {new Date(challenge.ends).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold tracking-tight">
                      {challenge.title}
                    </h2>
                  </div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Dumbbell aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </span>
                </div>

                <div className="mt-4 flex-1">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-extrabold tabular-nums leading-none">
                        {challenge.reps}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">reps by end of week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">
                        {memberCount} joined
                      </p>
                      {joined && (
                        <p className="mt-1 text-[11px] font-semibold text-primary">
                          You · {myReps} / {challenge.reps}
                        </p>
                      )}
                    </div>
                  </div>
                  {joined && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((myReps / challenge.reps) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>

                <Link
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/challenges/${challenge.id}`}
                >
                  <ShieldCheck aria-hidden="true" className="size-3.5" strokeWidth={2} />
                  {joined ? "View challenge" : "Join challenge"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
