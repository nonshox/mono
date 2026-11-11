import { Suspense } from "react";
import { NotificationExperience } from "@/components/interface/notification-experience";
import { NotificationsSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccount } from "@/features/auth/session";

export const metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
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
    <main className="px-4 py-8">
      <NotificationExperience />
    </main>
  );
}
