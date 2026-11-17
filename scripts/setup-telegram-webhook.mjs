// Registers the Telegram webhook for the production deployment + prints status.
// Usage: node --env-file=.env scripts/setup-telegram-webhook.mjs
import process from "node:process";

for (const name of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error("TELEGRAM_WEBHOOK_SECRET must match ^[A-Za-z0-9_-]{1,256}$");
  process.exit(1);
}

const url = process.argv[2] ?? "https://promono.vercel.app/api/telegram/webhook";
const api = `https://api.telegram.org/bot${token}`;

const call = async (method, body) => {
  const res = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
};

const info = await call("getWebhookInfo", {});
console.log("before:", JSON.stringify({ url: info.data?.result?.url ?? null, pending: info.data?.result?.pending_update_count ?? null, last_error: info.data?.result?.last_error_message ?? null }));

const set = await call("setWebhook", {
  url,
  secret_token: secret,
  allowed_updates: ["message"],
});
if (!set.data?.ok) {
  console.error("setWebhook failed:", JSON.stringify(set.data));
  process.exit(1);
}
console.log("setWebhook: ok ->", url);

const after = await call("getWebhookInfo", {});
console.log("after:", JSON.stringify({ url: after.data?.result?.url ?? null, pending: after.data?.result?.pending_update_count ?? null, allowed_updates: after.data?.result?.allowed_updates ?? null, last_error: after.data?.result?.last_error_message ?? null, max_connections: after.data?.result?.max_connections ?? null }));
