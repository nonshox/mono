import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getChallengeDetail } from "@/features/challenges/service";
import { ChallengeDetailBody } from "@/components/interface/challenge-detail";
import { ChallengeSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";

export const metadata = {
  title: "Challenge",
};

export const instant = false;

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ChallengeSkeleton />}>
      <AuthenticatedDetail params={params} />
    </Suspense>
  );
}

async function AuthenticatedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const { id } = await params;
  const detail = await getChallengeDetail(id, account.$id);
  if (!detail) {
    return (
      <main className="grid flex-1 place-items-center px-6">
        <div className="text-center">
          <p className="type-section">Challenge not found</p>
          <p className="type-lead mt-2">Maybe the round ended. Tap Train and keep going.</p>
          <Link className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-xs font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/challenges">
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            Challenges
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8 lg:px-8">
      <ChallengeDetailBody
        challengeId={detail.id}
        initial={detail}
      />
    </main>
  );
}
