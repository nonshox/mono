import { Suspense } from "react";
import { SettingsExperience } from "@/components/interface/settings-experience";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccountData } from "@/features/auth/session";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedSettings />
    </Suspense>
  );
}

async function AuthenticatedSettings() {
  const accountData = await getCurrentAccountData();
  if (!accountData) {
    return <SessionExpired />;
  }

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <SettingsExperience
        email={accountData.user.email}
        initialSessions={accountData.sessions}
      />
    </main>
  );
}
