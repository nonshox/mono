import { Suspense } from "react";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { listYearEntries, listYearsWithEntries } from "@/features/days/service";
import { userDay, userTimeZone } from "@/lib/dates";
import { PageLoader } from "@/components/shared/page-loader";
import { SessionExpired } from "@/components/shared/session-expired";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import { DayDots } from "@/components/features/home/day-dots";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  let account;
  try {
    account = await getCurrentAccount();
  } catch (error) {
    if (error instanceof AppwriteUnavailableError) {
      return <ServiceUnavailable />;
    }
    throw error;
  }
  if (!account) {
    return <SessionExpired />;
  }

  const user = await getUserRow(account.$id).catch(() => null);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const today = userDay(user?.tz);
  const year = Number(today.slice(0, 4));
  const [entries, years] = await Promise.all([
    listYearEntries(account.$id, year).catch(() => []),
    listYearsWithEntries(account.$id).catch(() => []),
  ]);
  const dateLong = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: userTimeZone(user?.tz),
  }).format(new Date());

  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        <header>
          <p className="type-eyebrow">{dateLong}</p>
          <h1 className="type-title mt-1 text-foreground">
            {firstName ? `Hey, ${firstName}.` : "Hey there."}
          </h1>
        </header>

        <DayDots entries={entries} today={today} year={year} years={years} />
      </div>
    </main>
  );
}

