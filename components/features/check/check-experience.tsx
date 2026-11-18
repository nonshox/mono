"use client";

import { useEffect } from "react";
import { useCheckStore } from "@/features/check/store";
import { BUCKETS } from "@/features/check/types";
import { BucketCard } from "@/components/features/check/bucket-card";
import { EndDayButton } from "@/components/features/check/end-day-button";

export function CheckExperience({
  initial,
}: {
  initial: {
    items: Array<{
      id: string;
      bucket: "rise" | "midday" | "evening";
      text: string;
      order: number;
      done: boolean;
    }>;
    day: string;
    satisfied: number | null;
  };
}) {
  const hydrate = useCheckStore((state) => state.hydrate);
  const loading = useCheckStore((state) => state.loading);

  useEffect(() => {
    hydrate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Until the store hydrates, render the familiar quiet loading state.
  if (loading) {
    return (
      <main className="min-h-full w-full bg-background px-3 pb-20 pt-5 sm:px-6 sm:pt-8">
        <h1 className="sr-only">Check</h1>
        <div className="mx-auto w-full max-w-5xl md:max-w-6xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {BUCKETS.map((bucket) => (
              <div
                aria-hidden="true"
                className="h-64 rounded-2xl border-2 border-border bg-popover sm:h-96"
                key={bucket}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full w-full bg-background px-3 pb-20 pt-5 sm:px-6 sm:pt-8">
      <h1 className="sr-only">Check</h1>
      <div className="mx-auto w-full max-w-5xl md:max-w-6xl">
        {/* Buckets — three vertical strips */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {BUCKETS.map((bucket) => (
            <BucketCard bucket={bucket} key={bucket} />
          ))}
        </div>

        <EndDayButton />
      </div>
    </main>
  );
}
