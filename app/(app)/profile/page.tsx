import {
  Dumbbell,
  Flame,
  Pencil,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import {
  getRecentWorkouts,
  getWorkoutSummary,
} from "@/features/workouts/service";
import { ProfileSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { EmptyState } from "@/components/interface/empty-state";
import { UserAvatar } from "@/components/interface/user-avatar";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <AuthenticatedProfile />
    </Suspense>
  );
}

async function AuthenticatedProfile() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const [user, workout, sessions] = await Promise.all([
    getUserRow(account.$id).catch(() => null),
    getWorkoutSummary(account.$id).catch(() => null),
    getRecentWorkouts(account.$id, 5).catch(() => []),
  ]);

  const name = user?.name.trim() || "";
  const email = account.email;
  const joined = user?.$createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(user.$createdAt))
    : null;

  const stats = [
    { icon: Dumbbell, value: workout?.sessions ?? 0, label: "Sessions" },
    { icon: Zap, value: workout?.totalReps ?? 0, label: "Total reps" },
    { icon: Trophy, value: workout?.bestSet ?? 0, label: "Best set" },
    { icon: Flame, value: workout?.streak ?? 0, label: "Day streak" },
  ];

  return (
    <main className="w-full px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8 lg:px-8">
      {/* Identity card */}
      <section className="surface-card flex flex-wrap items-center gap-5 p-5 sm:flex-nowrap sm:gap-6 sm:p-6">
        <UserAvatar
          avatar={user?.avatar ?? ""}
          name={name || email}
          size={104}
        />
        <div className="min-w-0 flex-1">
          <h1 className="type-section truncate">
            {name || "Name not set"}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {email}
          </p>
          {joined && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Member since {joined}
            </p>
          )}
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-border/60 bg-card px-3 text-xs font-semibold outline-none transition hover:border-border hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          href="/profile/edit"
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Edit profile
        </Link>
      </section>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            className="surface-card grid justify-items-center gap-1 p-4"
            key={stat.label}
          >
            <stat.icon
              aria-hidden="true"
              className="size-4 text-primary"
              strokeWidth={1.8}
            />
            <p className="text-xl font-extrabold tabular-nums leading-none">
              {stat.value}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <section aria-label="Recent sessions" className="mt-6">
        <h2 className="type-eyebrow mb-1.5 px-1">Recent sessions</h2>
        {sessions.length === 0 ? (
          <EmptyState
            action={
              <Link
                className="inline-flex h-9 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                href="/pushups"
              >
                Start training
              </Link>
            }
            description="Your first session will show up here — and unlock your stats."
            icon={Dumbbell}
            title="No sessions yet"
          />
        ) : (
          <div className="surface-card divide-y divide-border/60 overflow-hidden">
            {sessions.map((session) => (
              <div
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                key={session.id}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Dumbbell aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {session.kind === "pushup" ? "Push-ups" : session.kind}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {relativeDay(session.createdAt)} · {formatDuration(session.duration)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums">
                  {session.reps}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">
                    reps
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
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
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${String(rest).padStart(2, "0")}s`
    : `${rest}s`;
}
