import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryExperience } from "@/components/interface/library-experience";
import { PageLoader } from "@/components/interface/page-loader";

export const metadata: Metadata = {
  title: "Library",
};

export default function LibraryPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LibraryExperience />
    </Suspense>
  );
}
