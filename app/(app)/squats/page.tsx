import { Suspense } from "react";
import { ExerciseCounter } from "@/components/interface/exercise-counter";
import { PageLoader } from "@/components/interface/page-loader";import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccount } from "@/features/auth/session";

export const metadata = {
  title: "Squats",
};

export default function SquatsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedSquats />
    </Suspense>
  );
}

async function AuthenticatedSquats() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  return (
    <main className="h-[calc(100svh-7rem)] w-full overflow-hidden bg-white md:grid md:place-items-center md:p-6 lg:h-svh lg:p-8">
      <ExerciseCounter kind="squat" />
    </main>
  );
}