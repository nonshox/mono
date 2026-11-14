import {
  Medal,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import {
  getRecentWorkouts,
  getWorkoutSummary,
} from "@/features/workouts/service";
import { getCompletedChallengeCount } from "@/features/challenges/service";
import { getGlobalRank } from "@/features/leaderboard/service";
import { MILESTONES, unlockedMilestones } from "@/lib/achievements";
import { computeLevel } from "@/lib/level";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { UserAvatar } from "@/components/interface/user-avatar";
import { AchievementGrid } from "@/components/interface/achievement-grid";

export const metadata = {
  title: "Profile",
};

export const instant = false;

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}

const kindLabel = (kind: string) =>
  kind === "pushup" ? "Push-ups" : kind === "squat" ? "Squats" : kind === "plank" ? "Plank" : kind;

async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const { id } = await params;
  if (account.$id === id) {
    redirect("/profile");
  }

  const user = await getUserRow(id).catch(() => null);
  if (!user) {
    notFound();
  }

  const [summary, sessions, completed, rankInfo] =
    await Promise.all([
      getWorkoutSummary(id).catch(() => null),
      getRecentWorkouts(id, 6).catch(() => []),
      getCompletedChallengeCount(id).catch(() => 0),
      getGlobalRank(id).catch(() => ({ rank: null, totalPushups: 0 })),
    ]);

  const totalReps = summary?.totalReps ?? 0;
  const sessionsCount = summary?.sessions ?? 0;
  const streak = summary?.streak ?? 0;
  const bestSet = summary?.bestSet ?? 0;
  const unlocked = unlockedMilestones({
    sessions: sessionsCount,
    totalReps,
    streak,
    bestSet,
  });
  const level = computeLevel(totalReps);
  const joined = user.$createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(user.$createdAt))
    : null;

  const stats = [
    { value: totalReps.toLocaleString(), label: "Push-ups" },
    { value: streak.toLocaleString(), label: "Streak" },
    { value: completed.toLocaleString(), label: "Completed" },
    { value: bestSet.toLocaleString(), label: "Best set" },
    { value: level.toLocaleString(), label: "Level" },
  ];

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Identity */}
        <header className="flex items-center gap-4 border-b border-border/60 pb-5">
          <UserAvatar
            avatar={user.avatar ?? ""}
            name={user.name}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {user.name || "Unnamed athlete"}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-sm">
              {joined ? `Member since ${joined}` : "Mono Performance athlete"}
              {rankInfo.rank !== null && ` · Global #${rankInfo.rank}`}
            </p>
          </div>
          {rankInfo.rank !== null && rankInfo.rank <= 3 && (
            <span
              aria-label={`Global rank ${rankInfo.rank}`}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 text-[11px] font-bold text-amber-700"
            >
              <Medal aria-hidden="true" className="size-3" strokeWidth={2.4} />#
              {rankInfo.rank}
            </span>
          )}
        </header>

        {/* Stat strip */}
        <dl
          aria-label="Career stats"
          className="grid grid-cols-5 divide-x divide-border/60 border-b border-border/60"
        >
          {stats.map((stat) => (
            <div
              className="grid justify-items-center gap-0.5 px-1 py-4 sm:py-6"
              key={stat.label}
            >
              <dt className="order-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
                {stat.label}
              </dt>
              <dd className="order-1 text-lg font-semibold tabular-nums leading-none text-foreground sm:text-2xl md:text-3xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Achievements */}
        <section aria-label="Achievements" className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between px-0.5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Achievements
            </h2>
            <span className="text-[10px] tabular-nums text-muted-foreground/80">
              {unlocked.length} of {MILESTONES.length}
            </span>
          </div>
          <AchievementGrid unlockedIds={unlocked} />
        </section>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <section aria-label="Recent sessions" className="mt-6">
            <div className="mb-1.5 flex items-baseline justify-between px-0.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Sessions
              </h2>
              <span className="text-[10px] tabular-nums text-muted-foreground/80">
                {sessionsCount} total
              </span>
            </div>
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {sessions.map((session) => (
                <li className="flex items-center gap-3 py-2.5 sm:py-3" key={session.id}>
                  <span className="w-14 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
                    {kindLabel(session.kind)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/80">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(session.createdAt))}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {session.reps}
                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                      reps
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
