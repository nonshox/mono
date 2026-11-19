"use client";

import {
  Download,
  LoaderCircle,
  Send,
  BellRing,
  NotebookPen,
  Unlink,
  Mail,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createTelegramLink,
  disconnectTelegram,
  fetchTelegramStatus,
} from "@/features/telegram/client-api";
import { fetchSessions, type AuthSession, revokeSession } from "@/features/auth/client-api";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { fetchUser, saveUserLetter, saveUserNudge } from "@/features/users/client-api";
import { useUserStore } from "@/features/users/store";
import { SettingsSessions } from "@/components/features/settings/settings-sessions";
import { SettingsExport } from "@/components/features/settings/settings-export";
import { SettingsDanger } from "@/components/features/settings/settings-danger";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [letterOn, setLetterOn] = useState(false);
  const [letterSaving, setLetterSaving] = useState(false);
  const [review, setReview] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [letter, setLetter] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingSession, setPendingSession] = useState("");
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchTelegramStatus()
      .then((isConnected) => active && setTelegramConnected(isConnected))
      .catch(() => active && setError("Status failed"))
      .finally(() => active && setLoadingTelegram(false));
    fetchUser()
      .then((user) => {
        if (!active) return;
        setNudgeOn(user.nudge ?? false);
        setLetterOn(user.ai ?? false);
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
      setError(getApiErrorMessage(cause, "Save failed"));
    } finally {
      setNudgeSaving(false);
    }
  };

  const toggleLetter = async () => {
    if (letterSaving) return;
    const next = !letterOn;
    setLetterOn(next);
    setLetterSaving(true);
    try {
      const saved = await saveUserLetter(next);
      const current = useUserStore.getState().user;
      if (current) useUserStore.getState().setUser({ ...current, ai: saved.ai ?? next });
    } catch (cause) {
      setLetterOn(!next);
      setError(getApiErrorMessage(cause, "Save failed"));
    } finally {
      setLetterSaving(false);
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
      setError(getApiErrorMessage(cause, "Compilation failed"));
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

  const generateLetter = async () => {
    if (letterLoading) return;
    setLetterLoading(true);
    setError("");
    try {
      const { data } = await apiClient.post<{ letter: string }>("/ai/letter");
      setLetter(data.letter);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Compilation failed"));
    } finally {
      setLetterLoading(false);
    }
  };

  const downloadLetter = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mono-week-letter.txt";
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
      setError("Sessions unavailable");
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
      setError("Session not revoked");
    } finally {
      setPendingSession("");
    }
  };

  return (
    <main className="min-h-full w-full bg-background px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:max-w-3xl">
        {/* Header */}
        <header className="px-1">
          <h1 className="type-title text-foreground">
            Settings
          </h1>
          <p className="mt-0.5 truncate text-xs text-foreground">{email}</p>
        </header>

        {/* Notifications â€” Telegram */}
        <section
          aria-label="Notifications"
          className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5"
        >
          <h2 className="type-eyebrow">
            Notifications
          </h2>
          <div className="mt-2 divide-y divide-border/60">
            <div className="flex items-center gap-3 py-3">
              <Send aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-4 text-foreground">Telegram</p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  {loadingTelegram
                    ? "Checkingâ€¦"
                    : telegramConnected
                      ? "Pushes on activity"
                      : "Not connected"}
                </p>
              </div>
              <Button
                className="h-8 shrink-0 gap-1.5 rounded-full border-2 border-border px-3.5 text-xs font-semibold disabled:opacity-40"
                disabled={telegramPending || loadingTelegram}
                onClick={() => void toggleTelegram()}
                type="button"
                variant="outline"
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
              </Button>
            </div>
            {telegramLink && (
              <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <a
                  className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
                  href={telegramLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Telegram to finish linking
                </a>
                <Button
                  className="h-auto px-0 text-xs font-semibold no-underline hover:no-underline hover:opacity-80"
                  disabled={telegramPending}
                  onClick={() => void refreshTelegram()}
                  type="button"
                  variant="link"
                >
                  Refresh status
                </Button>
              </div>
            )}
            {/* Evening nudge â€” only useful with Telegram connected */}
            <div className="flex items-center gap-3 py-3">
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
                    ? "8pm if no entry that day."
                    : "Connect Telegram first."}
                </p>
              </div>
                <Switch
                  aria-busy={nudgeSaving}
                  aria-label="Evening nudge"
                  checked={nudgeOn}
                  className="shrink-0"
                  disabled={!telegramConnected || nudgeSaving}
                  onCheckedChange={() => void toggleNudge()}
                />
            </div>
            {/* Mono AI â€” day suggestions + Sunday letter (entries go to Google Gemini) */}
            <div className="flex items-center gap-3 py-3">
              <NotebookPen
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
                strokeWidth={1.8}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-4 text-foreground">
                  Mono AI
                </p>
                <p className="mt-0.5 text-xs leading-4 text-foreground">
                  Day suggestions + Sunday letter, grounded in your writing.
                  Your entries go to Google Gemini when this is on.
                </p>
              </div>
              <Switch
                aria-busy={letterSaving}
                aria-label="Mono AI"
                checked={letterOn}
                className="shrink-0"
                disabled={letterSaving}
                onCheckedChange={() => void toggleLetter()}
              />
            </div>
          </div>
        </section>

        <SettingsSessions
          onRefresh={() => void refreshSessions()}
          onRevoke={(session) => void revokeSessionForAccount(session)}
          pendingSession={pendingSession}
          refreshing={refreshingSessions}
          sessions={sessions}
        />
        <SettingsExport />

        {/* Your week, on demand — the same letter the Sunday cron sends */}
        <section
          aria-label="Your week"
          className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5"
        >
          <h2 className="type-eyebrow">
            Your week
          </h2>
          <p className="mt-2 text-xs leading-5 text-foreground">
            The letter the Telegram bot sends on Sundays — words written, the
            longest day, recurring themes, the line to keep. Compiled on this
            device, nothing leaves it.
          </p>
          <Button
            aria-busy={letterLoading}
            className="mt-3 h-9 gap-1.5 rounded-full border-2 border-border px-4 text-xs font-semibold disabled:opacity-40"
            disabled={letterLoading}
            onClick={() => void generateLetter()}
            type="button"
            variant="outline"
          >
            {letterLoading ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Mail aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            )}
            {letterLoading ? "Compiling your week…" : "Compile my week"}
          </Button>
          {letter && (
            <div className="mt-3 rounded-xl border border-border/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {letter}
              </p>
              <div className="mt-3 border-t border-border/50 pt-2">
                <Button
                  className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  onClick={downloadLetter}
                  type="button"
                  variant="ghost"
                >
                  <Download aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  Download .txt
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Year in review â€” compiled locally from your entries */}
        <section
          aria-label="Year in review"
          className="rounded-2xl border-2 border-border/70 bg-popover p-4 sm:p-5"
        >
          <h2 className="type-eyebrow">
            {new Date().getUTCFullYear()} in review
          </h2>
          <p className="mt-2 text-xs leading-5 text-foreground">
            A letter compiling everything you wrote this year â€” the shape,
            what recurred, one line to keep. Compiled on this device.
          </p>
          <Button
            aria-busy={reviewLoading}
            className="mt-3 h-9 gap-1.5 rounded-full border-2 border-border px-4 text-xs font-semibold disabled:opacity-40"
            disabled={reviewLoading}
            onClick={() => void generateReview()}
            type="button"
            variant="outline"
          >
            {reviewLoading ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <NotebookPen aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            )}
            {reviewLoading ? "Reading your yearâ€¦" : "Generate my year"}
          </Button>
          {review && (
            <div className="mt-3 rounded-xl border border-border/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {review}
              </p>
              <div className="mt-3 border-t border-border/50 pt-2">
                <Button
                  className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  onClick={downloadReview}
                  type="button"
                  variant="ghost"
                >
                  <Download aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  Download .txt
                </Button>
              </div>
            </div>
          )}
        </section>

        <SettingsDanger />

        {/* About Mono — public page, allowed */}
        <Link
          className="mx-auto mt-6 block w-fit text-[10px] font-semibold uppercase tracking-wider text-foreground/50 no-underline outline-none transition hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          href="/about"
        >
          About Mono
        </Link>

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







