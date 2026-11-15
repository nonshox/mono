import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { listAllEntries } from "@/features/days/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { JournalExperience } from "@/components/interface/journal-experience";

export const metadata: Metadata = {
  title: "Journal",
};

export default function JournalPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedJournal />
    </Suspense>
  );
}

async function AuthenticatedJournal() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const entries = await listAllEntries(account.$id).catch(() => []);
  return <JournalExperience entries={entries} />;
}
