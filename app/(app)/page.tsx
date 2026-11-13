import { ArrowRight, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { getWorkoutSummary } from "@/features/workouts/service";
import {
  getActiveChallenges,
  getChallengeDetail,
  getJoinedChallengeIds,
} from "@/features/challenges/service";
import { HomeSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { UserAvatar } from "@/components/interface/user-avatar";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const user = await getUserRow(account.$id).catch(() => null);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const workout = await getWorkoutSummary(account.$id).catch(() => null);
  const [challenges, joinedIds] = await Promise.all([
    getActiveChallenges(),
    getJoinedChallengeIds(account.$id),
  ]);
  const joinedChallenge = challenges.find((c) => joinedIds.has(c.id)) ?? challenges[0] ?? null;
  const detail = joinedChallenge
    ? await getChallengeDetail(joinedChallenge.id, account.$id).catch(() => null)
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pb-8 md:pt-10 lg:px-6">
      {/* Hero — greeting + single CTA */}
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="type-eyebrow text-primary">Mono Performance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {firstName ? `Hey, ${firstName}.` : "Hey there."}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One session. One rep at a time.
          </p>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground outline-none transition hover:opacity-90 active:scale-[0.98]"
          href="/pushups"
        >
          <Dumbbell aria-hidden="true" className="size-4" strokeWidth={2} />
          Train
        </Link>
      </header>

      {/* Stacked lines — compact, functional */}
      <div className="mt-6 divide-y divide-border/60">
        {/* Weekly challenge line */}
        <section aria-label="Weekly challenge" className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Challenge · ends {detail ? new Date(detail.ends).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "soon"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {detail ? detail.title : "Weekly round"}
              </p>
            </div>
            {detail && (
              <div className="shrink-0 -space-x-1.5">
                {detail.leaderboard.slice(0, 4).map((e) => (
                  <UserAvatar
                    avatar={e.avatar || undefined}
                    key={e.userId}
                    className="size-7 border-2 border-background"
                    name={e.name}
                    size={28}
                  />
                ))}
              </div>
            )}
          </div>
          {detail && (
            <>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, Math.round((detail.myReps / detail.reps) * 100))}%` }}
                    />
                  </div>
                </div>
                <p className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  <span className="text-primary">{detail.myReps}</span>/{detail.reps}
                </p>
              </div>
              <Link
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline underline-offset-4"
                href={`/challenges/${detail.id}`}
              >
                {joinedIds.has(joinedChallenge!.id) ? "View challenge" : "Join now"}
                <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
              </Link>
            </>
          )}
        </section>

        {/* Stats line */}
        {(workout?.sessions || workout?.totalReps) && (
          <section aria-label="Your stats" className="py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Your week
            </p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <Stat label="Streak" value={workout?.streak ?? 0} unit="days" />
              <Stat label="Total reps" value={workout?.totalReps ?? 0} />
              <Stat label="Best set" value={workout?.bestSet ?? 0} />
            </div>
          </section>
        )}

        {/* Leaders line */}
        {detail && detail.leaderboard.length > 0 && (
          <section aria-label="Leaderboard" className="py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Leaders
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {detail.leaderboard.slice(0, 6).map((entry) => (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                    entry.isYou
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-card"
                  }`}
                  key={entry.userId}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold tabular-nums ${
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
                  <UserAvatar
                    avatar={entry.avatar || undefined}
                    name={entry.name}
                    size={24}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {entry.name}
                    </p>
                    <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
                      {entry.reps.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
      <p className="text-xl font-extrabold tabular-nums text-foreground leading-none">
        {value.toLocaleString()}
        {unit && (
          <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
