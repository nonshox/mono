import { z } from "zod";
import { after } from "next/server";
import { jsonError, logFailure } from "@/lib/http";
import {
  consumeTelegramLink,
  resolveTelegramUser,
  sendTelegramMessage,
  verifyTelegramWebhookSecret,
} from "@/features/telegram/service";
import {
  classifyTelegramText,
  TELEGRAM_HELP,
  TELEGRAM_NOT_LINKED,
} from "@/features/telegram/commands";
import {
  replyCapture,
  replyCheck,
  replyWeek,
} from "@/features/telegram/replies";

const telegramIdSchema = z.union([
  z.number().int().safe().positive(),
  z.string().regex(/^[1-9]\d{0,31}$/),
]);

export const maxDuration = 30;

const telegramUpdateSchema = z.object({
  message: z
    .object({
      text: z.string().max(512),
      chat: z.object({
        id: telegramIdSchema,
        type: z.string(),
      }),
      from: z.object({
        id: telegramIdSchema,
      }),
    })
    .optional(),
});

const sendReply = async (
  chatId: string,
  text: string,
  buttons: Array<{ text: string; webApp: string }>,
): Promise<void> => {
  await sendTelegramMessage(chatId, text, buttons);
};

export async function POST(request: Request) {
  if (
    !verifyTelegramWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
    )
  ) {
    return jsonError(403, "WEBHOOK_REJECTED", "Webhook authorization failed.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_UPDATE", "Webhook update is invalid.");
  }
  const parsed = telegramUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, "INVALID_UPDATE", "Webhook update is invalid.");
  }

  const message = parsed.data.message;
  if (
    !message ||
    message.chat.type !== "private" ||
    String(message.chat.id) !== String(message.from.id)
  ) {
    return Response.json({ ok: true });
  }

  const origin = new URL(request.url).origin;
  const chatId = String(message.chat.id);
  const intent = classifyTelegramText(message.text);

  // Every intent except /start requires a linked Mono account; say so plainly.
  if (intent.kind !== "start") {
    const userId = await resolveTelegramUser(String(message.from.id));
    if (!userId) {
      after(async () => {
        try {
          await sendTelegramMessage(chatId, TELEGRAM_NOT_LINKED, []);
        } catch (error) {
          logFailure("Telegram not-linked reply", error);
        }
      });
      return Response.json({ ok: true, connected: false });
    }
    after(async () => {
      try {
        if (intent.kind === "check") {
          await replyCheck(origin, sendReply, chatId, userId);
        } else if (intent.kind === "week") {
          await replyWeek(origin, sendReply, chatId, userId);
        } else if (intent.kind === "capture") {
          await replyCapture(origin, sendReply, chatId, userId, intent.text);
        } else {
          await sendTelegramMessage(chatId, TELEGRAM_HELP, [
            { text: "Open Mono", webApp: `${origin}/` },
          ]);
        }
      } catch (error) {
        logFailure("Telegram command", error);
        try {
          await sendTelegramMessage(
            chatId,
            "Something broke — try again or open the app.",
            [],
          );
        } catch {
          /* bot can't reach the user either */
        }
      }
    });
    return Response.json({ ok: true });
  }

  // /start — existing link flow.
  if (!intent.code) {
    after(async () => {
      try {
        await sendTelegramMessage(
          chatId,
          "Welcome to Mono. Tap below to open the app.",
          [{ text: "Open Mono", webApp: `${origin}/` }],
        );
      } catch (error) {
        logFailure("Telegram welcome", error);
      }
    });
    return Response.json({ ok: true });
  }

  try {
    const result = await consumeTelegramLink(intent.code, String(message.from.id), chatId);
    if (result.status === "connected") {
      after(async () => {
        try {
          await sendTelegramMessage(
            chatId,
            "Your Mono account is now connected to Telegram.",
            [{ text: "Open Mono", webApp: `${origin}/` }],
          );
        } catch (error) {
          logFailure("Telegram connection confirmation", error);
        }
      });
      return Response.json({ ok: true, connected: true });
    }
    return Response.json({ ok: true, connected: false });
  } catch (error) {
    logFailure("Telegram webhook", error);
    return jsonError(503, "WEBHOOK_TEMPORARY_FAILURE", "Try again later.");
  }
}
