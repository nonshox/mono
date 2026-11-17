import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { loadCheckBundle } from "@/features/check/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
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
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const bundle = await loadCheckBundle(account.$id);
  return <CheckExperience initial={bundle} />;
}
