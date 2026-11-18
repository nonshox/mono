import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

/** Chrome (top bar / mobile nav) only for the authenticated app area. */
export default function AppLayout({ children }: { children: ReactNode }) {
  // WorkspaceShell uses usePathname (and so do its Links) â€” a dynamic API.
  // It must sit behind a Suspense boundary or static prerendering throws.
  // Fallback mirrors the shell's opaque background so there's no white flash.
  return (
    <Suspense fallback={<div className="flex min-h-full flex-col bg-background" />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
