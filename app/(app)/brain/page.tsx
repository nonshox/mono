import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { listBrainTasks } from "@/features/brain/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { BrainExperience } from "@/components/interface/brain-experience";

export const metadata: Metadata = {
  title: "Brain",
};

export default function BrainPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedBrain />
    </Suspense>
  );
}

async function AuthenticatedBrain() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const tasks = await listBrainTasks(account.$id).catch(() => []);
  return <BrainExperience initialTasks={tasks} />;
}
