import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";
import { listAllEntries } from "@/features/days/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { ServiceUnavailable } from "@/components/interface/service-unavailable";
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
  let account;
  try {
    account = await getCurrentAccount();
  } catch (error) {
    if (error instanceof AppwriteUnavailableError) {
      return <ServiceUnavailable />;
    }
    throw error;
  }
  if (!account) {
    return <SessionExpired />;
  }

  const entries = await listAllEntries(account.$id).catch(() => []);
  return <JournalExperience entries={entries} />;
}
