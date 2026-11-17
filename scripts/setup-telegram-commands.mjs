// Registers the bot menu commands.
// Usage: node --env-file=.env scripts/setup-telegram-commands.mjs
for (const name of ["TELEGRAM_BOT_TOKEN"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}
const token = process.env.TELEGRAM_BOT_TOKEN;

const commands = [
  { command: "start", description: "Welcome & link your Mono account" },
  { command: "today", description: "Your three buckets and tick state" },
  { command: "week", description: "Your week, compiled" },
];

const call = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};

const before = await call("getMyCommands", {});
console.log("before:", JSON.stringify(before.result ?? before));

const set = await call("setMyCommands", { commands });
if (!set.ok) {
  console.error("setMyCommands failed:", JSON.stringify(set));
  process.exit(1);
}
console.log("setMyCommands: ok");

const after = await call("getMyCommands", {});
console.log("after:", JSON.stringify(after.result ?? after));
