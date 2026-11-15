import { Suspense } from "react";
import { SettingsExperience } from "@/components/interface/settings-experience";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
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
    <SettingsExperience
      email={accountData.user.email}
      initialSessions={accountData.sessions}
    />
  );
}
