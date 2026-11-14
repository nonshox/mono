import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getChallengeDetail } from "@/features/challenges/service";
import { ChallengeDetailBody } from "@/components/interface/challenge-detail";
import { PageLoader } from "@/components/interface/page-loader";
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
    <Suspense fallback={<PageLoader />}>
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
      <main className="grid min-h-full w-full flex-1 place-items-center bg-white px-6">
        <div className="max-w-xs text-center">
          <p className="text-base font-semibold tracking-tight text-foreground">
            Challenge not found
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            The round ended or the link is wrong.
          </p>
          <Link
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-[11px] font-semibold text-background outline-none transition hover:opacity-90"
            href="/challenges"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            Challenges
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full w-full bg-white px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <ChallengeDetailBody
        challengeId={detail.id}
        initial={detail}
      />
    </main>
  );
}
