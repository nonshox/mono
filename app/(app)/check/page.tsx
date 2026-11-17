import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { loadCheckBundle } from "@/features/check/satisfy";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { ServiceUnavailable } from "@/components/interface/service-unavailable";
import { CheckExperience } from "@/components/interface/check-experience";

export const metadata: Metadata = {
  title: "Check",
};

export default function CheckPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedCheck />
    </Suspense>
  );
}

async function AuthenticatedCheck() {
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
  const bundle = await loadCheckBundle(account.$id, user?.tz ?? null);
  return <CheckExperience initial={bundle} />;
}
