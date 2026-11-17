import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { AppwriteException, ID, Query } from "node-appwrite";
import { getDatabaseId, getTables, runTransaction } from "@/lib/appwrite/tables";
import {
  findTelegramConnection,
  getTelegramTokenByUser,
  pruneCodes,
  type TelegramConnectionRow,
  type TelegramTokenRow,
} from "./connection";

export class TelegramLinkRateLimitError extends Error {}

class TelegramLinkRaceError extends Error {}

export async function createTelegramLink(userId: string): Promise<string> {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!botUsername || !/^[A-Za-z0-9_]{2,29}bot$/i.test(botUsername)) {
    throw new Error("Telegram bot username is not configured.");
  }
  const tables = getTables();
  // Self-cleaning: purge dead rows before adding new ones. Never fails the link.
  await pruneCodes().catch(() => 0);
  const currentToken = await getTelegramTokenByUser(userId);
  const now = Date.now();
  if (
    currentToken &&
    Date.parse(currentToken.expires) - now > 9.5 * 60 * 1000
  ) {
    throw new TelegramLinkRateLimitError();
  }
  const rawToken = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(rawToken).digest("hex");
  const data = {
    user: userId,
    hash,
    expires: new Date(now + 10 * 60 * 1000).toISOString(),
    used: false,
  };
  if (currentToken) {
    await tables.updateRow({
      databaseId: getDatabaseId(),
      tableId: "codes",
      rowId: currentToken.$id,
      data,
    });
  } else {
    await tables.createRow<TelegramTokenRow>({
      databaseId: getDatabaseId(),
      tableId: "codes",
      rowId: userId,
      permissions: [],
      data,
    });
  }
  return `https://t.me/${botUsername}?start=${rawToken}`;
}

export async function consumeTelegramLink(
  rawToken: string,
  telegramUserId: string,
  chatId: string,
): Promise<
  | { status: "connected"; userId: string }
  | { status: "invalid" | "expired" | "used" | "conflict" }
> {
  const hash = createHash("sha256").update(rawToken).digest("hex");
  const result = await getTables().listRows<TelegramTokenRow>({
    databaseId: getDatabaseId(),
    tableId: "codes",
    queries: [Query.equal("hash", hash), Query.limit(1)],
    total: false,
  });
  const token = result.rows[0];
  if (!token) {
    return { status: "invalid" };
  }
  if (token.used) {
    return { status: "used" };
  }
  if (Date.parse(token.expires) <= Date.now()) {
    return { status: "expired" };
  }

  const [userConnection, telegramConnection] = await Promise.all([
    findTelegramConnection("user", token.user),
    findTelegramConnection("member", telegramUserId),
  ]);
  if (telegramConnection && telegramConnection.user !== token.user) {
    return { status: "conflict" };
  }

  try {
    await runTransaction(async (transactionId) => {
      const currentToken = await getTables().getRow<TelegramTokenRow>({
        databaseId: getDatabaseId(),
        tableId: "codes",
        rowId: token.$id,
      });
      if (currentToken.used || Date.parse(currentToken.expires) <= Date.now()) {
        throw new TelegramLinkRaceError();
      }

      await getTables().updateRow({
        databaseId: getDatabaseId(),
        tableId: "codes",
        rowId: currentToken.$id,
        transactionId,
        data: { used: true },
      });

      if (userConnection) {
        await getTables().updateRow({
          databaseId: getDatabaseId(),
          tableId: "telegram",
          rowId: userConnection.$id,
          transactionId,
          data: {
            member: telegramUserId,
            chat: chatId,
          },
        });
      } else {
        await getTables().createRow<TelegramConnectionRow>({
          databaseId: getDatabaseId(),
          tableId: "telegram",
          rowId: ID.unique(),
          permissions: [],
          transactionId,
          data: {
            user: token.user,
            member: telegramUserId,
            chat: chatId,
            created: new Date().toISOString(),
          },
        });
      }
    });
    // Self-cleaning after a successful link — purge dead rows.
    await pruneCodes().catch(() => 0);

    return { status: "connected", userId: token.user };
  } catch (error) {
    if (error instanceof TelegramLinkRaceError) {
      return { status: "used" };
    }
    if (error instanceof AppwriteException && error.code === 409) {
      return { status: "conflict" };
    }
    throw error;
  }
}

export async function removeTelegramConnection(userId: string): Promise<void> {
  const connection = await findTelegramConnection("user", userId);
  const token = await getTelegramTokenByUser(userId);
  if (!connection && !token) return;

  await runTransaction(async (transactionId) => {
    if (connection) {
      await getTables().deleteRow({
        databaseId: getDatabaseId(),
        tableId: "telegram",
        rowId: connection.$id,
        transactionId,
      });
    }
    if (token && !token.used) {
      await getTables().updateRow({
        databaseId: getDatabaseId(),
        tableId: "codes",
        rowId: token.$id,
        transactionId,
        data: { used: true },
      });
    }
  });
}

export async function getTelegramConnectionStatus(userId: string): Promise<boolean> {
  return Boolean(await findTelegramConnection("user", userId));
}
