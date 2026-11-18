import { Suspense } from "react";
import { SettingsExperience } from "@/components/features/settings/settings-experience";
import { PageLoader } from "@/components/shared/page-loader";
import { SessionExpired } from "@/components/shared/session-expired";
import { getCurrentAccountData, AppwriteUnavailableError } from "@/features/auth/session";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";

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
  let accountData;
  try {
    accountData = await getCurrentAccountData();
  } catch (error) {
    if (error instanceof AppwriteUnavailableError) {
      return <ServiceUnavailable />;
    }
    throw error;
  }
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
