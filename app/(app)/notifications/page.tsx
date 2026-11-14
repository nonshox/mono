import { Suspense } from "react";
import { NotificationExperience } from "@/components/interface/notification-experience";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccount } from "@/features/auth/session";

export const metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedNotifications />
    </Suspense>
  );
}

async function AuthenticatedNotifications() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <NotificationExperience />
    </main>
  );
}
