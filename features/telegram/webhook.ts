import "server-only";

import { timingSafeEqual } from "node:crypto";
import { findTelegramConnection } from "./connection";

export function verifyTelegramWebhookSecret(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    !received ||
    !expected ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(expected)
  ) {
    return false;
  }
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

/** Resolve the Mono userId for a linked Telegram member id, or null if unlinked. */
export async function resolveTelegramUser(
  telegramUserId: string,
): Promise<string | null> {
  const connection = await findTelegramConnection("member", telegramUserId);
  return connection?.user ?? null;
}
