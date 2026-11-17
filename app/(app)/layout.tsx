import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/components/interface/workspace-shell";

/** Chrome (top bar / mobile nav) only for the authenticated app area. */
export default function AppLayout({ children }: { children: ReactNode }) {
  // WorkspaceShell uses usePathname (and so do its Links) — a dynamic API.
  // It must sit behind a Suspense boundary or static prerendering throws.
  return (
    <Suspense>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
