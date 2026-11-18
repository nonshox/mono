import type { Metadata } from "next";
import { Suspense } from "react";
import { PauseExperience } from "@/components/features/pause/pause-experience";
import { PageLoader } from "@/components/shared/page-loader";

export const metadata: Metadata = {
  title: "Pause",
};

export default function PausePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PauseExperience />
    </Suspense>
  );
}
