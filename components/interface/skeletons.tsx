/** Pulsing placeholders for Suspense boundaries. No client JS needed. */

function Block({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-xl bg-muted motion-reduce:animate-none ${className ?? ""}`}
    />
  );
}

export function HomeSkeleton() {
  return (
    <div aria-label="Loading" className="mx-auto w-full max-w-2xl px-4 pt-16" role="status">
      <Block className="h-8 w-56" />
      <Block className="mt-3 h-4 w-72" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div aria-label="Loading" className="mx-auto w-full max-w-2xl px-4 pt-8" role="status">
      <Block className="h-7 w-44" />
      <div className="mt-6 grid gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="flex items-center gap-3" key={i}>
            <Block className="size-9 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Block className="h-3 w-2/3" />
              <Block className="h-2 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div aria-label="Loading" className="mx-auto w-full max-w-2xl px-4 pt-8" role="status">
      <Block className="h-7 w-36" />
      <div className="mt-6 grid gap-4">
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-32" />
      </div>
    </div>
  );
}
