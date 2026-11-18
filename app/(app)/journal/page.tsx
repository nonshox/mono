import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";
import { listYearEntries, listYearsWithEntries } from "@/features/days/service";
import { listBooks } from "@/features/books/service";
import { PageLoader } from "@/components/shared/page-loader";
import { SessionExpired } from "@/components/shared/session-expired";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import { JournalExperience } from "@/components/features/journal/journal-experience";

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

  // Windowed load — latest year first; earlier years are lazy-loaded by the
  // client ("Load earlier years") so the archive never hits the browser whole.
  const years = await listYearsWithEntries(account.$id).catch(() => []);
  const latest = years[years.length - 1] ?? new Date().getFullYear();
  const [entries, books] = await Promise.all([
    listYearEntries(account.$id, latest).catch(() => []),
    listBooks(account.$id).catch(() => []),
  ]);
  return <JournalExperience entries={entries} books={books} years={years} />;
}
