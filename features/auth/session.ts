import { Account, AppwriteException } from "node-appwrite";
import { cookies } from "next/headers";
import {
  createAccountClient,
  getSessionCookieName,
} from "@/lib/appwrite/server";

function isTransient(error: unknown): boolean {
  // Appwrite network is down / unreachable — treat as "not signed in",
  // never crash a page over an infrastructure hiccup.
  if (error instanceof AppwriteException) {
    return false; // 401 etc. are handled by the caller
  }
  if (error instanceof TypeError) return true; // Node fetch failure
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return (
      [
        "ECONNREFUSED",
        "ECONNRESET",
        "ENOTFOUND",
        "ETIMEDOUT",
        "EAI_AGAIN",
        "ENETUNREACH",
        "AbortError",
      ].includes(String(code)) ||
      /fetch\s+failed|network/i.test(error.message)
    );
  }
  return false;
}

async function getCurrentAccountClient() {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(getSessionCookieName())?.value;

  return sessionSecret
    ? new Account(createAccountClient(sessionSecret))
    : null;
}

export async function getCurrentAccount() {
  const account = await getCurrentAccountClient();

  if (!account) {
    return null;
  }

  try {
    return await account.get();
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      return null;
    }
    if (isTransient(error)) {
      return null;
    }

    throw error;
  }
}

export async function getCurrentAccountData() {
  const account = await getCurrentAccountClient();
  if (!account) {
    return null;
  }

  try {
    const [user, sessionList] = await Promise.all([
      account.get(),
      account.listSessions(),
    ]);

    return {
      user,
      sessions: sessionList.sessions.map((session) => ({
        id: session.$id,
        createdAt: session.$createdAt,
        expiresAt: session.expire,
        device: session.deviceName || session.clientName || "Unknown device",
        operatingSystem: session.osName,
        current: session.current,
      })),
    };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      return null;
    }
    if (isTransient(error)) {
      return null;
    }

    throw error;
  }
}
