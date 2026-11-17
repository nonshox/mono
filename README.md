# Mono

A minimal, private journaling app — Next.js 16 (App Router, React 19, Tailwind 4) with an Appwrite backend. A year-in-dots journal, a three-bucket morning/midday/evening check, local-NLP actions, a Sunday letter, an evening Telegram nudge at your 10:00pm, and a Telegram bot that captures lines into your dot. Email-code auth, no passwords.

## Stack

- **Next.js 16** — App Router — React Server Components — `cacheComponents`
- **React 19** — **TypeScript** (strict, no `any`)
- **Tailwind CSS 4** — apple flat light design (`.surface-card`, hairline dividers, tracked micro labels)
- **Appwrite** (node-appwrite) — tables, auth via email token
- **Zod** — validation — **Vitest** — tests — **Zustand** — client state — **sonner** — toasts — **@vercel/analytics** — usage metrics

## Quickstart

```sh
cp .env.example .env    # fill in your Appwrite project values
npm install
npm run dev
```

**Tables:** create these once in your Appwrite project (TablesDB → Create table):

| Table | Columns | Index |
|---|---|---|
| `users` | `email` (email), `name` (string), `avatar` (string, optional), `nudge` (bool), `ai` (bool), `actions` (string[]), `tz` (string) | — (row id = auth account `$id`) |
| `notifications` | `user`, `kind` (strings), `body` (≤280), `ref` (string, optional), `read` (bool) | key on `user`, key on `user`+`read` |
| `telegram` | `user`, `member`, `chat` (strings), `created` (datetime) | unique on `user`, `member` |
| `codes` | `user`, `hash` (strings), `expires` (datetime), `used` (bool) | unique on `hash` |
| `days` | `user`, `day` (`YYYY-MM-DD`), `text` (≤1000), `satisfied` (int, optional) | key on `user` |
| `timeline` | `user`, `bucket`, `text`, `order`, `done` (bool) | key on `user` |

Both `days` and `timeline` are created by `scripts/setup-days.mjs` (idempotent — also creates `users.nudge` and `users.ai` bool columns and `days.satisfied` int).

`users` also needs a `nudge` (bool, default false) attribute for the optional evening Telegram nudge (`/api/cron/nudge`, requires `CRON_SECRET`, fires each user's local 10:00pm — see below) and an `ai` (bool, default false) attribute for the opt-in weekly letter (`/api/cron/letter` at 09:00 UTC Sunday).

**Cron triggers.** Vercel Hobby only allows daily crons, so `/api/cron/nudge` is pinged hourly by `.github/workflows/cron.yml` (UTC, best-effort) — set repo secrets `MONO_URL` (e.g. `https://your-app.vercel.app`) and `CRON_SECRET` (same value as the app's env var), then enable Actions. The endpoint itself is plan-agnostic: it sends each user a nudge only when it's their local 10:00pm (`users.tz`, learned silently from the browser; falls back to UTC) and they haven't written today, and also drops the same moment into the in-app bell (`day_ending`). `/api/cron/letter` stays on Vercel (`vercel.json`, weekly — hobby-safe). On Vercel Pro, you can delete the workflow and re-add `{ "path": "/api/cron/nudge", "schedule": "0 * * * *" }` to `vercel.json` instead — use exactly one mechanism.

**No AI, by design.** Everything is computed from your entries, on this machine — the Sunday letter (words written, longest day, themes, satisfaction average, the line to keep), the smart nudge (anchored to what you keep writing about), the year review in Settings (month-by-month shape and themes), and the one-tap **dictation polish** (Wand next to the mic — fillers stripped, `i`→`I`, sentences tidied, meaning untouched). Your entries never leave the device.

Dictation uses Chrome's built-in Web Speech API — free, no keys, no model downloads. Chrome sometimes blocks it (insecure origin, VPN, Windows-level mic denial); the usual requirement is simply that the app is served from `http://localhost:3000` or HTTPS. Themes under `/journal` are computed locally and need no key; tapping a theme filters the journal for it.

Both are provisioned automatically (idempotent) by:

```sh
node --env-file=.env scripts/setup-days.mjs
```

Scripts: `dev` — `build` — `start` — `lint` — `test` — `typecheck` — `check` (all checks).

## Deploying with zero paid plans (Vercel Hobby + GitHub + Appwrite)

Everything in Mono runs at $0. No Pro features are used or assumed:

1. Push to `main` — the Vercel GitHub integration deploys it (CI must stay green: typecheck · lint · tests · build).
2. Vercel → Settings → Environment Variables (Production): `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_STORAGE_BUCKET_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, and optionally `GEMINI_API_KEY` (+ `GEMINI_MODEL`) for the opt-in Mono AI (suggestions, actions scan). Everything AI is optional; local fallbacks run without it.
3. Repo → Settings → Secrets and variables → Actions: add `CRON_SECRET` = the same value as in Vercel. That's the only repo secret — the production URL is inline in `.github/workflows/cron.yml`.
4. `vercel.json` carries only the weekly letter (Hobby-legal); the hourly evening nudge is `.github/workflows/cron.yml` calling `/api/cron/nudge` — keep Actions enabled.
5. Appwrite Cloud free tier covers tables + storage. No external paid services anywhere.
6. After deploy: register the Telegram webhook once, sign in once end-to-end, then Actions → "Cron — evening nudge" → **Run workflow** and confirm it's green.

Notes: Hobby cron fires within the scheduled hour (best-effort) — fine for a sunset nudge. GitHub Actions cron can drift ±1 hour at peak — also fine. If you ever move to Vercel Pro, delete the workflow and re-add the hourly cron to `vercel.json` (exactly one nudge mechanism, never two).

CI: `.github/workflows/check.yml` runs typecheck → lint → tests → production build on every push and pull request. The build step uses a dummy env; Appwrite is never hit at build time.

## What's inside


- `/auth` — email-code sign-in (6-digit code, no password)
- bell icon (navbar) — inbox panel: grouping, unread badge, mark read/all-read
- `/` — greeting + **year in dots** (365-day journal: hollow dot, tap to write/edit/erase, “on this day” flashback, `/api/days*`)
- `/journal` — reading mode (every entry as one book, year dividers, search-within + last-30-days themes, tap to expand as a card)
- `/check` — minimal timeline: three fixed buckets (Rise · Midday · Evening), tap to tick/untick, "End of day" stores % of ticks as `days.satisfied` (0–100) on YES, or clears all ticks for tomorrow on NO
- `/profile` — identity card (avatar or initials, name, email, member since) + `/profile/edit` (name, photo upload/remove)
- `/settings` — account (sessions w/ revoke, Telegram connect, delete account)
- Navbar everywhere — logo + bell icon (notifications open as a dropdown panel), account menu

## Layout

```
app/
  (app)/             # authenticated area + chrome (navbar)
    page.tsx         # home
    profile/         # identity + /profile/edit
    settings/        # account, Telegram, sessions
  api/               # thin route handlers (auth check → service call)
  auth/              # public sign-in screen
  error.tsx          # branded global error screen
  globals.css        # design tokens
components/
  ui/                # primitives (button, dropdown-menu, input, label, sonner)
  interface/         # composed experiences (settings, editor, shell)
features/
  auth/              # email-code sign-in, session helpers, zod schemas
  notifications/     # generic notifications: notify(), list, mark-read
  telegram/          # Telegram link/unlink + webhook + delivery
  users/             # users row (rowId = auth account $id) + store
lib/
  http.ts            # jsonError, isSameOrigin, getAuthAccount, logFailure
  api-client.ts      # axios client + typed ApiError
  appwrite/          # server clients + TablesDB helpers (getTables, isNotFound)
scripts/             # (reserved for your own tooling)
```

## Conventions

- **Import alias** `@/*` → repo root. Server-only code imports `"server-only"`.
- **`features/<name>/{service,store,schemas,client-api,types}.ts`** — services are server-only, take explicit ids, never read cookies. Client state lives in `store.ts` (zustand).
- **Tables & attributes are one lowercase word.** No snake_case, no multi-word columns.
- **API route shape** — `isSameOrigin` (mutations) → `getAuthAccount` → zod `safeParse` → service → `NextResponse`. Errors: `logFailure(...)` + `jsonError(status, CODE, msg)`.
- **`notify(recipient, actor, type, ref?)`** — the one-call notification API. It skips self-notifications and best-effort forwards to Telegram. `type` is a past-tense verb phrase; clients render `${actorName} ${type}`.
- **shadcn primitives first** — `components/ui` for primitives, Tailwind for the rest; prefer tokens (`--color-*`, `--radius`, etc.).

## Notifications

Notifications ship generic but **dormant** — your app decides when to notify:

```ts
import { notify } from "@/features/notifications/service";

await notify(followingId, currentUserId, "followed you", rowId);
//          ^recipient  ^actor         ^type            ^ref (optional)
```

Self-notifications are skipped; same actor+type within 24h collapses into one grouped row. If the recipient linked Telegram, they get a one-line push there best-effort.
