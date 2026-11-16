import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { loadTodayBundle } from "@/features/today/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { TodayExperience } from "@/components/interface/today-experience";

export const metadata: Metadata = {
  title: "Today",
};

export default function TodayPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedToday />
    </Suspense>
  );
}

async function AuthenticatedToday() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const bundle = await loadTodayBundle(account.$id);
  return <TodayExperience initial={bundle} />;
}
