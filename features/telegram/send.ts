import "server-only";

import {
  findTelegramConnection,
  TelegramDeliveryError,
  type TelegramConnectionRow,
} from "./connection";

/**
 * Shared sender — all Telegram sends go through here.
 * Retries transient failures with exponential backoff; bounded by 3 attempts.
 */
async function callTelegramSendApi(
  chatId: string,
  text: string,
  buttons?: Array<{ text: string; webApp?: string; url?: string }>,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Telegram bot token is not configured.");
  }
  const replyMarkup = buttons?.length
    ? {
        inline_keyboard: [
          buttons.map((button) =>
            button.webApp
              ? { text: button.text, web_app: { url: button.webApp } }
              : { text: button.text, url: button.url },
          ),
        ],
      }
    : undefined;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) {
        throw new TelegramDeliveryError(response.status);
      }
      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("ok" in result) ||
        result.ok !== true
      ) {
        throw new TelegramDeliveryError(response.status);
      }
      return;
    } catch (error) {
      lastError = error;
      if (
        error instanceof TelegramDeliveryError &&
        error.status < 500 &&
        error.status !== 429
      ) {
        break; // 4xx (other than 429) won't heal by retrying
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      }
    }
  }
  const detail =
    lastError instanceof TelegramDeliveryError
      ? `HTTP ${lastError.status}`
      : lastError instanceof Error
        ? lastError.name
        : "UnknownError";
  throw new Error(`Telegram delivery failed: ${detail}`);
}

/** Send a message to one user's linked chat. Silently skips unlink'd users. */
export async function sendTelegramNotification(
  userId: string,
  text: string,
): Promise<void> {
  const connection = await findTelegramConnection("user", userId);
  if (!connection) {
    return;
  }
  await callTelegramSendApi(connection.chat, text);
}

/** Send a message to a chat, optionally with inline buttons (URL or Mini App). */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons?: Array<{ text: string; webApp?: string; url?: string }>,
): Promise<void> {
  await callTelegramSendApi(chatId, text, buttons);
}

/** Connection lookup used by senders to skip unlink'd users quietly. */
export type { TelegramConnectionRow };
