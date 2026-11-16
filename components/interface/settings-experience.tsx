"use client";

import {
  Download,
  LoaderCircle,
  MonitorSmartphone,
  RefreshCw,
  Send,
  BellRing,
  Sparkles,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LocalDateTime } from "@/components/interface/local-date-time";
import {
  createTelegramLink,
  disconnectTelegram,
  fetchTelegramStatus,
} from "@/features/telegram/client-api";
import { fetchSessions, type AuthSession, revokeSession } from "@/features/auth/client-api";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { deleteAccount, fetchUser, saveUserAi, saveUserNudge } from "@/features/users/client-api";
import { useUserStore } from "@/features/users/store";
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
  const [nudgeOn, setNudgeOn] = useState(false);
  const [nudgeSaving, setNudgeSaving] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [review, setReview] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingSession, setPendingSession] = useState("");
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTelegramStatus()
      .then((isConnected) => active && setTelegramConnected(isConnected))
      .catch(() => active && setError("Telegram status could not be checked."))
      .finally(() => active && setLoadingTelegram(false));
    fetchUser()
      .then((user) => {
        if (!active) return;
        setNudgeOn(user.nudge ?? false);
        setAiOn(user.ai ?? false);
      })
      .catch(() => {});
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

  const toggleNudge = async () => {
    if (nudgeSaving || !telegramConnected) return;
    const next = !nudgeOn;
    setNudgeOn(next);
    setNudgeSaving(true);
    try {
      const saved = await saveUserNudge(next);
      const current = useUserStore.getState().user;
      if (current) useUserStore.getState().setUser({ ...current, nudge: saved.nudge ?? next });
    } catch (cause) {
      setNudgeOn(!next);
      setError(getApiErrorMessage(cause, "The nudge setting could not be saved."));
    } finally {
      setNudgeSaving(false);
    }
  };

  const toggleAi = async () => {
    if (aiSaving) return;
    const next = !aiOn;
    setAiOn(next);
    setAiSaving(true);
    try {
      const saved = await saveUserAi(next);
      const current = useUserStore.getState().user;
      if (current) useUserStore.getState().setUser({ ...current, ai: saved.ai ?? next });
    } catch (cause) {
      setAiOn(!next);
      setError(getApiErrorMessage(cause, "The Mono AI setting could not be saved."));
    } finally {
      setAiSaving(false);
    }
  };

  const generateReview = async () => {
    if (reviewLoading) return;
    setReviewLoading(true);
    setError("");
    try {
      const { data } = await apiClient.post<{ review: string }>("/ai/review");
      setReview(data.review);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Your year could not be compiled right now."));
    } finally {
      setReviewLoading(false);
    }
  };

  const downloadReview = () => {
    if (!review) return;
    const blob = new Blob([review], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mono-year-in-review.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const refreshTelegram = async () => {
    if (telegramPending) return;
    setTelegramPending(true);
    setError("");
    try {
      const isConnected = await fetchTelegramStatus();
      setTelegramConnected(isConnected);
      if (isConnected) setTelegramLink("");
      setMessage(isConnected ? "Telegram connected." : "Link pending â€” finish in Telegram.");
    } catch {
      setError("Telegram status could not be checked.");
    } finally {
      setTelegramPending(false);
    }
  };

  const refreshSessions = async () => {
    if (refreshingSessions) return;
    setRefreshingSessions(true);
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
      setError("Could not revoke that session.");
    } finally {
      setPendingSession("");
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/auth");
      router.refresh();
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Your account could not be deleted."));
      setDeleting(false);
    }
  };


  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Header */}
        <header className="border-b border-border/60 pb-4">
          <h1 className="type-title text-foreground">
            Settings
          </h1>
          <p className="mt-0.5 truncate text-xs text-foreground">{email}</p>
        </header>

        {/* Notifications â€” Telegram */}
        <section aria-label="Notifications" className="mt-6">
          <h2 className="type-eyebrow mb-1 px-0.5">
            Notifications
          </h2>
          <div className="border-y border-border/60">
            <div className="flex items-center gap-3 py-3">
              <Send aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-4 text-foreground">Telegram</p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  {loadingTelegram
                    ? "Checkingâ€¦"
                    : telegramConnected
                      ? "Connected â€” pushes when something happens."
                      : "Not connected"}
                </p>
              </div>
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-border px-3.5 text-xs font-semibold text-foreground outline-none transition hover:bg-muted disabled:opacity-40"
                disabled={telegramPending || loadingTelegram}
                onClick={() => void toggleTelegram()}
                type="button"
              >
                {telegramPending && (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                )}
                {telegramConnected ? (
                  <>
                    <Unlink aria-hidden="true" className="size-3.5" strokeWidth={2} />
                    Disconnect
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            </div>
            {telegramLink && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 py-2.5">
                <a
                  className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
                  href={telegramLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Telegram to finish linking
                </a>
                <button
                  className="text-xs font-semibold text-foreground transition hover:text-foreground"
                  disabled={telegramPending}
                  onClick={() => void refreshTelegram()}
                  type="button"
                >
                  Refresh status
                </button>
              </div>
            )}
            {/* Evening nudge â€” only useful with Telegram connected */}
            <div className="flex items-center gap-3 border-t border-border/60 py-3">
              <BellRing
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
                strokeWidth={1.8}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-4 text-foreground">
                  Evening nudge
                </p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  {telegramConnected
                    ? "8pm UTC â€” only if you havenâ€™t written that day."
                    : "Connect Telegram first."}
                </p>
              </div>
              <button
                aria-busy={nudgeSaving}
                aria-checked={nudgeOn}
                aria-label="Evening nudge"
                className={`relative h-6 w-10 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
                  nudgeOn ? "bg-foreground" : "bg-muted-foreground/25"
                }`}
                disabled={!telegramConnected || nudgeSaving}
                onClick={() => void toggleNudge()}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-secondary outline-none transition-transform ${
                    nudgeOn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* Mono AI â€” opt-in; entries go to Google Gemini when on */}
            <div className="flex items-center gap-3 border-t border-border/60 py-3">
              <Sparkles
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
                strokeWidth={1.8}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-4 text-foreground">
                  Mono AI
                </p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  Weekly letter Â· smarter nudge Â· year review â€” your entries go
                  to Google Gemini. Off means nothing leaves.
                </p>
              </div>
              <button
                aria-busy={aiSaving}
                aria-checked={aiOn}
                aria-label="Mono AI"
                className={`relative h-6 w-10 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
                  aiOn ? "bg-foreground" : "bg-muted-foreground/25"
                }`}
                disabled={aiSaving}
                onClick={() => void toggleAi()}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-secondary outline-none transition-transform ${
                    aiOn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Sessions */}
        <section aria-label="Sessions" className="mt-6">
          <div className="mb-1 flex items-center justify-between gap-3 px-0.5">
            <h2 className="type-eyebrow">
              Sessions
            </h2>
            <button
              aria-label="Refresh sessions"
              className="grid size-6 place-items-center rounded-md text-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              disabled={refreshingSessions}
              onClick={() => void refreshSessions()}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-3.5 ${refreshingSessions ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="border-y border-border/60 py-3 text-xs text-foreground">
              No active sessions.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 border-y border-border/60">
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
                      {session.operatingSystem ? `${session.operatingSystem} Â· ` : ""}
                      <LocalDateTime value={session.createdAt} />
                    </p>
                  </div>
                  {!session.current && (
                    <button
                      aria-label={`Revoke ${session.device} session`}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-50"
                      disabled={pendingSession === session.id}
                      onClick={() => void revokeSessionForAccount(session)}
                      type="button"
                    >
                      {pendingSession === session.id ? (
                        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                      ) : (
                        <X aria-hidden="true" className="size-4" />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Year in review â€” Mono AI compiles the year into a letter */}
        <section aria-label="Year in review" className="mt-6">
          <h2 className="type-eyebrow mb-1 px-0.5">
            {new Date().getUTCFullYear()} in review
          </h2>
          <div className="border-y border-border/60 py-3">
            <p className="text-xs leading-5 text-foreground">
              A letter compiling everything you wrote this year â€” the shape,
              what recurred, one line to keep.
            </p>
            {aiOn ? (
              <button
                aria-busy={reviewLoading}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-border px-4 text-xs font-semibold text-foreground outline-none transition hover:bg-muted disabled:opacity-40"
                disabled={reviewLoading}
                onClick={() => void generateReview()}
                type="button"
              >
                {reviewLoading ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                )}
                {reviewLoading ? "Reading your yearâ€¦" : "Generate review"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-foreground">
                Enable Mono AI above to generate.
              </p>
            )}
            {review && (
              <div className="mt-3 rounded-2xl border-2 border-border bg-popover p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {review}
                </p>
                <div className="mt-3 border-t border-border/50 pt-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={downloadReview}
                    type="button"
                  >
                    <Download aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                    Download .txt
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section aria-label="Delete account" className="mt-6">
          <h2 className="type-eyebrow mb-1 px-0.5 text-destructive">
            Delete account
          </h2>
          <div className="border-y border-destructive/20 py-3">
            <p className="text-xs leading-5 text-foreground">
              Erases your account and all data linked to it. This cannot be undone.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                aria-label="Type DELETE to confirm account deletion"
                autoComplete="off"
                className="type-eyebrow h-9 w-32 rounded-md border border-destructive/30 bg-transparent px-2 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-destructive"
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="DELETE"
                value={deleteConfirm}
              />
              <button
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-destructive px-4 text-xs font-semibold text-white outline-none transition hover:opacity-90 disabled:opacity-30"
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                onClick={() => void confirmDeleteAccount()}
                type="button"
              >
                {deleting ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />
                )}
                Delete
              </button>
            </div>
          </div>
        </section>

        {(error || message) && (
          <p
            className={`mt-4 px-0.5 text-xs leading-5 ${error ? "text-destructive" : "text-foreground"}`}
            role={error ? "alert" : "status"}
          >
            {error || message}
          </p>
        )}
      </div>
    </main>
  );
}







