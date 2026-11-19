import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-6">
      <EmptyState
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              href="/"
            >
              Go home
            </Link>
            {/* Stash is the one app page open to everyone. */}
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border-2 border-border px-4 text-sm font-medium text-foreground outline-none transition hover:border-foreground/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              href="/stash"
            >
              Try Stash
            </Link>
          </div>
        }
        description="This page doesn't exist."
        icon={Compass}
        title="Page not found"
      />
    </main>
  );
}
