import { Suspense } from "react";
import { SettingsExperience } from "@/components/interface/settings-experience";
import { SettingsSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccountData } from "@/features/auth/session";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
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
    <main className="px-4 py-8">
      <SettingsExperience
        email={accountData.user.email}
        initialSessions={accountData.sessions}
      />
    </main>
  );
}
