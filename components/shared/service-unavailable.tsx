import { Unplug } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

/** Shown when Appwrite is temporarily unreachable â€” not the user's fault. */
export function ServiceUnavailable() {
  return (
    <div className="grid flex-1 place-items-center px-6">
      <EmptyState
        description="Mono can't reach Appwrite right now. Your data is safe â€” this usually passes in a minute."
        icon={Unplug}
        title="Service unavailable"
      />
    </div>
  );
}
