import type { Metadata } from "next";
import { Suspense } from "react";
import { StashExperience } from "@/components/features/stash/stash-experience";
import { PageLoader } from "@/components/shared/page-loader";

export const metadata: Metadata = {
  title: "Stash",
};

export default function StashPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StashExperience />
    </Suspense>
  );
}
