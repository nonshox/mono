import "server-only";

/**
 * Telegram service — three focused modules, kept import-compatible
 * so consumers don't change:
 *   link.ts     — one-time link codes, connection state
 *   send.ts     — outbound messages (with retry)
 *   webhook.ts  — webhook secret verification + user resolution
 *   connection.ts — shared internals (types, table reads, pruneCodes)
 */
export {
  createTelegramLink,
  consumeTelegramLink,
  removeTelegramConnection,
  getTelegramConnectionStatus,
  TelegramLinkRateLimitError,
} from "./link";
export { sendTelegramNotification, sendTelegramMessage } from "./send";
export { verifyTelegramWebhookSecret, resolveTelegramUser } from "./webhook";
