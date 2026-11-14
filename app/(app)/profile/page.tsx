import {
  Dumbbell,
  Pencil,
} from "lucide-react";
import Link from "next/link";
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
import { AchievementGrid } from "@/components/interface/achievement-grid";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { EmptyState } from "@/components/interface/empty-state";
import { UserAvatar } from "@/components/interface/user-avatar";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedProfile />
    </Suspense>
  );
}

async function AuthenticatedProfile() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const [user, workout, sessions, completedChallenges, rankInfo] =
    await Promise.all([
      getUserRow(account.$id).catch(() => null),
      getWorkoutSummary(account.$id).catch(() => null),
      getRecentWorkouts(account.$id, 6).catch(() => []),
      getCompletedChallengeCount(account.$id).catch(() => 0),
      getGlobalRank(account.$id).catch(() => ({ rank: null, totalPushups: 0 })),
    ]);

  const totalReps = workout?.totalReps ?? 0;
  const sessionsCount = workout?.sessions ?? 0;
  const streak = workout?.streak ?? 0;
  const bestSet = workout?.bestSet ?? 0;
  const unlocked = unlockedMilestones({
    sessions: sessionsCount,
    totalReps,
    streak,
    bestSet,
  });
  const level = computeLevel(totalReps);

  const name = user?.name.trim() || "";
  const email = account.email;
  const avatarName = name || email;
  const joined = user?.$createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(user.$createdAt))
    : null;

  const stats = [
    { value: totalReps.toLocaleString(), label: "Push-ups" },
    { value: streak.toLocaleString(), label: "Streak" },
    { value: completedChallenges.toLocaleString(), label: "Completed" },
    { value: bestSet.toLocaleString(), label: "Best set" },
    { value: level.toLocaleString(), label: "Level" },
  ];

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Identity — one quiet line */}
        <header className="flex items-center gap-4 border-b border-border/60 pb-5">
          <UserAvatar
            avatar={user?.avatar ?? ""}
            name={avatarName}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {name || "Your name"}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-sm">
              {joined ? `Member since ${joined}` : email}
              {rankInfo.rank !== null && ` · Global #${rankInfo.rank}`}
            </p>
          </div>
          <Link
            aria-label="Edit profile"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href="/profile/edit"
          >
            <Pencil aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Link>
        </header>

        {/* Stat strip — no boxes, just numbers */}
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
        <section aria-label="Recent sessions" className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between px-0.5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Sessions
            </h2>
            <span className="text-[10px] tabular-nums text-muted-foreground/80">
              {sessionsCount} total
            </span>
          </div>
          {sessions.length === 0 ? (
            <div className="border-y border-border/60 py-4">
              <EmptyState
                action={
                  <Link
                    className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                    href="/pushups"
                  >
                    Start training
                  </Link>
                }
                description="One set is all it takes."
                icon={Dumbbell}
                title="No sessions yet"
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {sessions.map((session) => (
                <li className="flex items-center gap-3 py-2.5 sm:py-3" key={session.id}>
                  <span className="w-14 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
                    {session.kind === "pushup"
                      ? "Push-ups"
                      : session.kind === "squat"
                        ? "Squats"
                        : session.kind === "plank"
                          ? "Plank"
                          : session.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/80">
                    {relativeDay(session.createdAt)}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {session.reps}
                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">reps</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function relativeDay(value: string): string {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}
