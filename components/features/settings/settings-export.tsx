"use client";

import { FileJson, FileText } from "lucide-react";

/** Export links — everything Mono stores about you, downloadable, never uploaded. */
export function SettingsExport() {
  const linkClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-border px-4 text-xs font-semibold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section
      aria-label="Export your data"
      className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5"
    >
      <h2 className="type-eyebrow">Export</h2>
      <p className="mt-2 text-xs leading-5 text-foreground">
        Your words live on this server. Take a copy now and then — in case the
        box ever dies, your years go with it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a className={linkClass} download href="/api/export?format=json">
          <FileJson aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          JSON backup
        </a>
        <a className={linkClass} download href="/api/export?format=markdown">
          <FileText aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Markdown — read & print
        </a>
      </div>
    </section>
  );
}
