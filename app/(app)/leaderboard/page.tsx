import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Crown,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { getCurrentAccount } from "@/features/auth/session";
import {
  getGlobalLeaderboard,
  type LeaderboardWindow,
} from "@/features/leaderboard/service";
import { SessionExpired } from "@/components/interface/session-expired";
import { UserAvatar } from "@/components/interface/user-avatar";
import { PageLoader } from "@/components/interface/page-loader";


export const metadata = {
  title: "Leaderboard",
};

export const instant = false;

const WINDOWS: Array<{ id: LeaderboardWindow; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All time" },
];

export default function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <LeaderboardView searchParams={searchParams} />
    </Suspense>
  );
}

async function LeaderboardView({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const { window: raw } = await searchParams;
  const window: LeaderboardWindow =
    raw === "today" || raw === "week" || raw === "month" || raw === "all"
      ? raw
      : "week";

  const board = await getGlobalLeaderboard(account.$id, window);
  const nextUp =
    board.viewer.rank !== null && board.viewer.rank > 1
      ? (board.entries.find((entry) => entry.rank === board.viewer.rank! - 1) ??
        null)
      : null;

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="flex items-end justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl tracking-tight text-foreground">
              Leaderboard
            </h1>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Verified push-ups Â· live
            </p>
          </div>
        </header>

        {/* Time filter â€” underline tabs */}
        <nav
          aria-label="Time filter"
          className="flex items-center gap-4 border-b border-border/60"
        >
          {WINDOWS.map((item) => (
            <Link
              aria-current={window === item.id ? "true" : undefined}
              className={`-mb-px inline-flex h-10 items-center border-b-2 text-xs sm:text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                window === item.id
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground"
              }`}
              href={`/leaderboard?window=${item.id}`}
              key={item.id}
              scroll={false}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {board.entries.length === 0 ? (
          <div className="border-b border-border/60 py-10 text-center">
            <Trophy
              aria-hidden="true"
              className="mx-auto size-6 text-muted-foreground/50"
              strokeWidth={1.6}
            />
            <p className="mt-2 text-xs font-semibold text-foreground">
              Nobody on the board yet
            </p>
            <p className="mx-auto mt-1 max-w-[16rem] text-[11px] leading-4 text-muted-foreground">
              Be the first verified name up there.
            </p>
            <Link
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs sm:text-sm font-semibold text-background outline-none transition hover:opacity-90"
              href="/pushups"
            >
              Start training
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <>
            <ol className="divide-y divide-border/60 border-b border-border/60">
              {board.entries.map((entry) => {
                const isTop = entry.rank <= 3;
                return (
                  <li key={entry.userId}>
                    <Link
                      className="flex h-12 items-center gap-2.5 sm:h-14 outline-none transition hover:bg-muted/40 focus-visible:bg-muted/40"
                      href={`/profile/${entry.userId}`}
                    >
                      <span
                        className={`grid w-6 shrink-0 place-items-center text-xs sm:text-sm tabular-nums ${
                          isTop ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                        }`}
                      >
                        {entry.rank === 1 ? (
                          <Crown
                            aria-label="Rank 1"
                            className="size-3.5 text-amber-500"
                            strokeWidth={2.2}
                            fill="currentColor"
                          />
                        ) : (
                          entry.rank
                        )}
                      </span>
                      <UserAvatar avatar={entry.avatar || undefined} name={entry.name} size={28} />
                      <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium text-foreground">
                        {entry.name}
                        {entry.isYou && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                            you
                          </span>
                        )}
                      </span>
                      {window !== "all" && <TrendArrow trend={entry.trend} />}
                      <span className="shrink-0 text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                        {entry.reps.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>

            {/* Your standing, one line */}
            <p className="flex items-center justify-between gap-3 px-0.5 pt-3 text-[10px] text-muted-foreground">
              <span className="min-w-0 truncate">
                {board.viewer.rank !== null ? (
                  <>
                    <span className="font-semibold text-foreground">
                      You&apos;re #{board.viewer.rank}
                    </span>
                    {nextUp
                      ? ` Â· ${Math.max(1, nextUp.reps - board.viewer.reps + 1).toLocaleString()} reps to pass ${nextUp.name}`
                      : board.viewer.rank === 1
                        ? " Â· you lead the board"
                        : ""}
                  </>
                ) : (
                  "Not ranked â€” log a set to enter the board"
                )}
              </span>
              {window !== "all" && board.viewer.rank !== null && (
                <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">
                  <TrendArrow trend={board.viewer.trend} />
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function TrendArrow({ trend }: { trend: "up" | "down" | "same" | "new" }) {
  if (trend === "up") {
    return (
      <TrendingUp
        aria-label="Climbing"
        className="size-3 shrink-0 text-emerald-600"
        strokeWidth={2.2}
      />
    );
  }
  if (trend === "down") {
    return (
      <TrendingDown
        aria-label="Dropping"
        className="size-3 shrink-0 text-red-500"
        strokeWidth={2.2}
      />
    );
  }
  if (trend === "new") {
    return (
      <Sparkles
        aria-label="New"
        className="size-3 shrink-0 text-primary"
        strokeWidth={2}
      />
    );
  }
  return (
    <Minus
      aria-hidden="true"
      className="size-3 shrink-0 text-muted-foreground/50"
      strokeWidth={2}
    />
  );
}

