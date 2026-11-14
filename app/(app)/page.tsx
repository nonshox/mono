import { ArrowRight, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import {
  getRecentCommunitySessions,
  getWorkoutSummary,
} from "@/features/workouts/service";
import {
  getActiveChallenges,
  getChallengeDetail,
  getCompletedChallengeCount,
  getJoinedChallengeIds,
} from "@/features/challenges/service";
import { getGlobalRank } from "@/features/leaderboard/service";
import { MILESTONES, unlockedMilestones } from "@/lib/achievements";
import { computeLevel } from "@/lib/level";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { UserAvatar } from "@/components/interface/user-avatar";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

const kindLabel = (kind: string) =>
  kind === "pushup" ? "push-ups" : kind === "squat" ? "squats" : kind;

async function AuthenticatedHome() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const userId = account.$id;
  const user = await getUserRow(userId).catch(() => null);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  const [workout, challenges, joinedIds, rankInfo, community, completedChallenges] =
    await Promise.all([
      getWorkoutSummary(userId).catch(() => null),
      getActiveChallenges(),
      getJoinedChallengeIds(userId),
      getGlobalRank(userId).catch(() => ({ rank: null, totalPushups: 0 })),
      getRecentCommunitySessions(4).catch(() => []),
      getCompletedChallengeCount(userId).catch(() => 0),
    ]);

  const joinedChallenge = challenges.find((c) => joinedIds.has(c.id)) ?? challenges[0] ?? null;
  const detail = joinedChallenge
    ? await getChallengeDetail(joinedChallenge.id, userId).catch(() => null)
    : null;

  const totalReps = workout?.totalReps ?? 0;
  const sessionsCount = workout?.sessions ?? 0;
  const unlocked = unlockedMilestones({
    sessions: sessionsCount,
    totalReps,
    streak: workout?.streak ?? 0,
    bestSet: workout?.bestSet ?? 0,
  });
  const level = computeLevel(totalReps);
  const recentBadges = MILESTONES.filter((m) => unlocked.includes(m.id)).slice(-3);

  const stats = [
    { value: totalReps.toLocaleString(), label: "Push-ups" },
    { value: (workout?.streak ?? 0).toLocaleString(), label: "Streak" },
    { value: completedChallenges.toLocaleString(), label: "Completed" },
    { value: level.toLocaleString(), label: "Level" },
  ];

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="flex items-end justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {firstName ? `Hey, ${firstName}.` : "Hey there."}
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              One session. One rep at a time.
            </p>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 text-[11px] font-semibold text-background outline-none transition hover:opacity-90 active:scale-[0.98] sm:px-5 sm:text-xs"
            href="/pushups"
          >
            <Dumbbell aria-hidden="true" className="size-4" strokeWidth={2} />
            Train
          </Link>
        </header>

        {/* Stat strip */}
        <dl
          aria-label="Career stats"
          className="grid grid-cols-4 divide-x divide-border/60 border-b border-border/60"
        >
          {stats.map((stat) => (
            <div className="grid justify-items-center gap-0.5 px-1 py-3 sm:py-5" key={stat.label}>
              <dt className="order-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
                {stat.label}
              </dt>
              <dd className="order-1 text-lg font-semibold tabular-nums leading-none text-foreground sm:text-2xl md:text-3xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-[10px] text-muted-foreground">
          <span className="tabular-nums">
            {rankInfo.rank !== null ? `Ranked #${rankInfo.rank} globally` : "Unranked — log a set"}
          </span>
          <Link
            className="font-semibold text-primary outline-none transition hover:underline"
            href="/leaderboard"
          >
            Leaderboard →
          </Link>
        </div>

        {/* Weekly challenge — quiet line */}
        {detail && (
          <section aria-label="Weekly challenge" className="border-b border-border/60 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Challenge · ends{" "}
                  {new Date(detail.ends).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <Link
                  className="mt-0.5 block truncate text-xs font-semibold text-foreground outline-none transition hover:text-primary sm:text-sm"
                  href={`/challenges/${detail.id}`}
                >
                  {detail.title}
                </Link>
              </div>
              <div className="flex shrink-0 -space-x-1.5">
                {detail.leaderboard.slice(0, 4).map((entry) => (
                  <UserAvatar
                    avatar={entry.avatar || undefined}
                    className="border-2 border-white"
                    key={entry.userId}
                    name={entry.name}
                    size={24}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-1 flex-1 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.round((detail.myReps / detail.reps) * 100))}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {detail.myReps}/{detail.reps}
              </span>
            </div>
            <Link
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary outline-none transition hover:underline"
              href={`/challenges/${detail.id}`}
            >
              {joinedIds.has(joinedChallenge?.id ?? "") ? "View challenge" : "Join this round"}
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </Link>
          </section>
        )}

        {/* Leaders */}
        {detail && detail.leaderboard.length > 0 && (
          <section aria-label="Leaders" className="border-b border-border/60 py-4">
            <h2 className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Leaders this week
            </h2>
            <ol className="divide-y divide-border/60 border-y border-border/60">
              {detail.leaderboard.slice(0, 5).map((entry) => (
                <li
                  className={`flex h-10 items-center gap-2.5 sm:h-11 ${
                    entry.isYou ? "bg-muted/40" : ""
                  }`}
                  key={entry.userId}
                >
                  <span
                    className={`w-5 text-center text-[11px] tabular-nums sm:text-xs ${
                      entry.rank <= 3 ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <UserAvatar avatar={entry.avatar || undefined} name={entry.name} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground sm:text-xs">
                    {entry.name}
                    {entry.isYou && (
                      <span className="ml-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-primary">
                        you
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {entry.reps.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Recent badges */}
        {recentBadges.length > 0 && (
          <section aria-label="Recent achievements" className="border-b border-border/60 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Latest badges
              </h2>
              <Link
                className="text-[10px] font-semibold text-primary outline-none transition hover:underline"
                href="/profile"
              >
                Profile →
              </Link>
            </div>
            <p className="mt-1.5 truncate text-[11px] text-foreground sm:text-xs">
              {recentBadges.map((badge) => badge.title).join(" · ")}
            </p>
          </section>
        )}

        {/* Community activity */}
        {community.length > 0 && (
          <section aria-label="Community activity" className="mt-4">
            <h2 className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Around the board
            </h2>
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {community.map((session) => (
                <li key={session.id}>
                  <Link
                    className="flex h-10 items-center gap-2.5 py-0 outline-none transition hover:bg-muted/40 focus-visible:bg-muted/40"
                    href={`/profile/${session.userId}`}
                  >
                    <UserAvatar avatar={session.avatar || undefined} name={session.name} size={22} />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-foreground sm:text-xs">
                      <span className="font-medium">{session.name}</span>{" "}
                      <span className="text-muted-foreground">
                        · {session.reps.toLocaleString()} {kindLabel(session.kind)}
                      </span>
                    </span>
                    <time
                      className="shrink-0 text-[9px] font-medium tabular-nums text-muted-foreground/80"
                      dateTime={session.createdAt}
                    >
                      {relativeTime(session.createdAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function relativeTime(value: string): string {
  const date = new Date(value);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
