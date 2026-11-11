import Link from "next/link";

/** Shown when the session cookie is missing or expired mid-visit. */
export function SessionExpired() {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div className="grid max-w-xs justify-items-center gap-3">
        <p className="text-base font-semibold tracking-tight">
          Your session expired
        </p>
        <p className="text-sm text-muted-foreground">
          Sign in again to keep going.
        </p>
        <Link
          className="mt-1 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          href="/auth"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
