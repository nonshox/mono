import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div
      aria-label="Loading home"
      className="mx-auto max-w-3xl px-4 pb-24 pt-10 md:pb-8 md:pt-14 lg:px-6"
      role="status"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-9 w-56 md:h-12 md:w-80" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-7 flex gap-2">
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
      <div className="mt-6 divide-y divide-border/60">
        {[0, 1].map((i) => (
          <div className="py-4" key={i}>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div
      aria-label="Loading notifications"
      className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:pb-8 md:pt-8"
      role="status"
    >
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-7 w-44" />
      <Skeleton className="mt-4 h-8 w-40 rounded-full" />
      <div className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="flex items-center gap-3 px-3 py-2.5" key={i}>
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div
      aria-label="Loading profile"
      className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8"
      role="status"
    >
      <div className="flex items-center gap-5 py-2">
        <Skeleton className="size-24 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton className="h-20 rounded-2xl" key={i} />
        ))}
      </div>
      <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {[0, 1, 2].map((i) => (
          <div className="flex items-center gap-3 px-4 py-2.5" key={i}>
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChallengeSkeleton() {
  return (
    <div
      aria-label="Loading challenges"
      className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8"
      role="status"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-7 w-44" />
          <Skeleton className="mt-1 h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div className="surface-card p-4" key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-40" />
            <Skeleton className="mt-5 h-10 w-24" />
            <Skeleton className="mt-4 h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div
      aria-label="Loading settings"
      className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:pb-8 md:pt-8"
      role="status"
    >
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-3 w-48" />
      <div className="mt-7 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {[0, 1].map((i) => (
          <div className="flex items-center gap-3 px-4 py-3" key={i}>
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
