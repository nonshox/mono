"use client";

import {
  ChevronRight,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Unlink,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LocalDateTime } from "@/components/interface/local-date-time";
import { Button } from "@/components/ui/button";
import {
  createTelegramLink,
  disconnectTelegram,
  fetchTelegramStatus,
} from "@/features/telegram/client-api";
import {
  fetchSessions,
  logout,
  revokeSession,
  type AuthSession,
} from "@/features/auth/client-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { EmptyState } from "@/components/interface/empty-state";
import { useRouter } from "next/navigation";

export function SettingsExperience({
  email,
  initialSessions,
}: {
  email: string;
  initialSessions: AuthSession[];
}) {
  const router = useRouter();
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [loadingTelegram, setLoadingTelegram] = useState(true);
  const [telegramPending, setTelegramPending] = useState(false);
  const [telegramLink, setTelegramLink] = useState("");
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingSession, setPendingSession] = useState("");
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    fetchTelegramStatus()
      .then((isConnected) => {
        if (active) setTelegramConnected(isConnected);
      })
      .catch(() => {
        if (active) setError("Telegram status could not be checked.");
      })
      .finally(() => {
        if (active) setLoadingTelegram(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleTelegram = async () => {
    if (telegramPending) return;
    setTelegramPending(true);
    setError("");
    setMessage("");
    try {
      if (telegramConnected) {
        await disconnectTelegram();
        setTelegramConnected(false);
        setTelegramLink("");
        setMessage("Telegram disconnected.");
        return;
      }
      setTelegramLink(await createTelegramLink());
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Telegram could not be updated."));
    } finally {
      setTelegramPending(false);
    }
  };

  const refreshTelegram = async () => {
    if (telegramPending) return;
    setTelegramPending(true);
    setError("");
    try {
      const isConnected = await fetchTelegramStatus();
      setTelegramConnected(isConnected);
      if (isConnected) setTelegramLink("");
      setMessage(
        isConnected
          ? "Telegram is connected."
          : "Not connected yet — finish linking in Telegram first.",
      );
    } catch {
      setError("Telegram status could not be checked.");
    } finally {
      setTelegramPending(false);
    }
  };

  const refreshSessions = async () => {
    if (refreshingSessions) return;
    setRefreshingSessions(true);
    setError("");
    try {
      setSessions(await fetchSessions());
    } catch {
      setError("Active sessions could not be loaded.");
    } finally {
      setRefreshingSessions(false);
    }
  };

  const revokeSessionForAccount = async (session: AuthSession) => {
    if (pendingSession) return;
    setPendingSession(session.id);
    setError("");
    try {
      await revokeSession(session.id);
      if (session.current) {
        router.refresh();
        return;
      }
      await refreshSessions();
      setMessage("Session revoked.");
    } catch {
      setError("We could not revoke that session. Please try again.");
    } finally {
      setPendingSession("");
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.replace("/auth");
      router.refresh();
    }
  };

  const sessionRevokeButton = (session: AuthSession) => (
    <button
      aria-label={`Revoke ${session.device} session`}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      disabled={pendingSession === session.id}
      onClick={() => void revokeSessionForAccount(session)}
      type="button"
    >
      {pendingSession === session.id ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <X aria-hidden="true" className="size-4" />
      )}
    </button>
  );

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="type-section">Settings</h1>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
      </header>

      <div className="grid gap-6">
        {/* Profile gateway — this page is for operations; the person lives at /profile. */}
        <Link
          aria-label="Open your profile"
          className="surface-card flex items-center gap-4 px-4 py-3.5 outline-none transition hover:border-border/80 focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
          href="/profile"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-9">
            <UserRound aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold leading-5">
              Your profile
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              Photo, name, and training history
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.8}
          />
        </Link>

        <Section title="Notifications">
          <Row
            action={
              <Button
                disabled={telegramPending || loadingTelegram}
                onClick={() => void toggleTelegram()}
                size="sm"
                type="button"
                variant={telegramConnected ? "outline" : "default"}
              >
                {telegramPending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : telegramConnected ? (
                  <>
                    <Unlink aria-hidden="true" />
                    Disconnect
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            }
            description={
              loadingTelegram
                ? "Checking connection..."
                : telegramConnected
                  ? "Connected — you get a private message when something happens."
                  : "Not connected"
            }
            icon={Send}
            title="Telegram"
          />
          {telegramLink && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/40 px-4 py-3 sm:px-5">
              <a
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
                href={telegramLink}
                rel="noreferrer"
                target="_blank"
              >
                Open Telegram to finish linking
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </a>
              <Button
                className="text-muted-foreground"
                disabled={telegramPending}
                onClick={() => void refreshTelegram()}
                size="xs"
                type="button"
                variant="ghost"
              >
                Check connection
              </Button>
            </div>
          )}
        </Section>

        <Section
          action={
            <button
              aria-label="Refresh sessions"
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              disabled={refreshingSessions}
              onClick={() => void refreshSessions()}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4 ${refreshingSessions ? "animate-spin" : ""}`}
              />
            </button>
          }
          title="Sessions"
        >
          {sessions.length === 0 ? (
            <EmptyState
              description="Devices signed in to this account appear here."
              icon={MonitorSmartphone}
              title="No active sessions"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {sessions.map((session) => (
                <li className="flex items-center gap-3 px-4 py-2.5 sm:px-5" key={session.id}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MonitorSmartphone
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.8}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs font-semibold leading-5">
                      <span className="truncate">{session.device}</span>
                      {session.current && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                      {session.operatingSystem ? `${session.operatingSystem} — ` : ""}
                      <LocalDateTime value={session.createdAt} />
                    </p>
                  </div>
                  {!session.current && sessionRevokeButton(session)}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Sign out lives in the desktop account dropdown; mobile has no dropdown. */}
        <div className="md:hidden">
          <Section title="Session">
            <Row
              action={
                <Button
                  onClick={() => void signOut()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Sign out
                </Button>
              }
              description="End this session on this device."
              icon={LogOut}
              title="Sign out"
            />
          </Section>
        </div>
      </div>

      {(error || message) && (
        <p
          className={`mt-4 px-1 text-xs leading-5 ${error ? "text-destructive" : "text-muted-foreground"}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
        <h2 className="type-eyebrow">{title}</h2>
        {action}
      </div>
      <div className="surface-card divide-y divide-border/60 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Send;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-9">
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-5">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
