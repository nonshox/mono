import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { HomeSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";

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

  // Name is nice-to-have; never let the row break the home page.
  const user = await getUserRow(account.$id).catch(() => null);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Mono
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {firstName ? `Hey, ${firstName}.` : "Hey there."}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your private base is ready — signed in as {account.email}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          className="group rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition hover:border-border focus-visible:ring-2 focus-visible:ring-ring"
          href="/notifications"
        >
          <Bell aria-hidden="true" className="size-5 text-muted-foreground transition group-hover:text-foreground" strokeWidth={1.8} />
          <p className="mt-6 text-sm font-semibold">Notifications</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Everything that happened, newest first.
          </p>
        </Link>
        <Link
          className="group rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition hover:border-border focus-visible:ring-2 focus-visible:ring-ring"
          href="/settings"
        >
          <Settings aria-hidden="true" className="size-5 text-muted-foreground transition group-hover:text-foreground" strokeWidth={1.8} />
          <p className="mt-6 text-sm font-semibold">Settings</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Name, Telegram, and your active sessions.
          </p>
        </Link>
      </div>
    </main>
  );
}
