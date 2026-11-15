import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { listYearEntries } from "@/features/days/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { DayDots } from "@/components/interface/day-dots";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const user = await getUserRow(account.$id).catch(() => null);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const year = new Date().getUTCFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const entries = await listYearEntries(account.$id, year).catch(() => []);

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        <header className="border-b border-border/60 pb-5">
          <p className="type-eyebrow">
            Mono
          </p>
          <h1 className="type-title mt-1 text-foreground">
            {firstName ? `Hey, ${firstName}.` : "Hey there."}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A clean base for whatever you build next.
          </p>
        </header>

        <DayDots entries={entries} today={today} year={year} />
      </div>
    </main>
  );
}
