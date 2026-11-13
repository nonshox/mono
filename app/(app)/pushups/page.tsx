import { Suspense } from "react";
import { PushupCounter } from "@/components/interface/pushup-counter";
import { NotificationsSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccount } from "@/features/auth/session";

export const metadata = {
  title: "Push-ups",
};

export default function PushupsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <AuthenticatedPushups />
    </Suspense>
  );
}

async function AuthenticatedPushups() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  return (
    <main className="w-full px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8 lg:px-8">
      <PushupCounter />
    </main>
  );
}
