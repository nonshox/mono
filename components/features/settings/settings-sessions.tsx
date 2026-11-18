"use client";

import { LoaderCircle, MonitorSmartphone, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalDateTime } from "@/components/shared/local-date-time";
import type { AuthSession } from "@/features/auth/client-api";

/** Active sign-ins — current device can't be revoked; the rest can. */
export function SettingsSessions({
  sessions,
  pendingSession,
  refreshing,
  onRefresh,
  onRevoke,
}: {
  sessions: AuthSession[];
  /** Row id currently being revoked, or "" when idle. */
  pendingSession: string;
  refreshing: boolean;
  onRefresh: () => void;
  onRevoke: (session: AuthSession) => void;
}) {
  return (
    <section
      aria-label="Sessions"
      className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-eyebrow">Sessions</h2>
        <Button
          aria-label="Refresh sessions"
          className="size-7 rounded-full disabled:opacity-50"
          disabled={refreshing}
          onClick={onRefresh}
          size="icon"
          type="button"
          variant="ghost"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      {sessions.length === 0 ? (
        <p className="py-4 text-xs text-foreground">No active sessions.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {sessions.map((session) => (
            <li className="flex items-center gap-3 py-2" key={session.id}>
              <MonitorSmartphone
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
                strokeWidth={1.8}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-foreground">
                  <span className="truncate">{session.device}</span>
                  {session.current && (
                    <span className="type-eyebrow shrink-0 rounded-full bg-muted px-1.5 py-0.5">
                      this device
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  {session.operatingSystem ? `${session.operatingSystem} · ` : ""}
                  <LocalDateTime value={session.createdAt} />
                </p>
              </div>
              {!session.current && (
                <Button
                  aria-label={`Revoke ${session.device} session`}
                  className="size-7 shrink-0 rounded-md hover:text-destructive disabled:opacity-50"
                  disabled={pendingSession === session.id}
                  onClick={() => onRevoke(session)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {pendingSession === session.id ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <X aria-hidden="true" className="size-4" />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
