# Mono

A minimal, private app base — Next.js 16 (App Router, React 19, Tailwind 4) with an Appwrite backend, email-code auth, generic notifications, and an optional Telegram link flow. Clone it, rename it, ship your idea.

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
| `users` | `email` (email), `name` (string) | — (row id = auth account `$id`) |
| `notifications` | `recipient`, `actor`, `type` (strings), `ref` (string, optional), `read` (bool) | key on `recipient` |
| `telegram` | `user`, `member`, `chat` (strings), `created` (datetime) | unique on `user`, `member` |
| `codes` | `user`, `hash` (strings), `expires` (datetime), `used` (bool) | unique on `hash` |
| `days` | `user`, `day` (`YYYY-MM-DD`), `text` (≤1000) | key on `user` |
| `tasks` | `user`, `text` (≤300), `done` (bool) | key on `user` |

Both `days` and `tasks` are created by `scripts/setup-days.mjs` (idempotent — also creates the `users` `nudge` and `ai` bool columns).

`users` also needs a `nudge` (bool, default false) attribute for the optional evening Telegram nudge (`/api/cron/nudge`, Vercel cron at 20:00 UTC, requires `CRON_SECRET`) and an `ai` (bool, default false) attribute for the opt-in Mono AI (weekly letter via `/api/cron/letter` at 09:00 UTC Sunday, smarter nudge, year review in Settings — requires `GEMINI_API_KEY`).

**Mono AI (opt-in, default off):** one Settings toggle ("Mono AI") gates every feature that sends your entries to Google Gemini — the Sunday letter, the smarter evening nudge, the `Generate review` button in Settings, and the one-tap **dictation polish** (wand next to the mic — speech in, clean prose out, Undo guaranteed). Off means your entries never leave Mono for AI.

Dictation is dual-engine and always tries Chrome's built-in speech first; if it is blocked or unreachable (e.g. VPN, proxy, corporate network, Windows-level denial, insecure origin) the engine transparently falls back to an **offline Whisper model** running in-browser via transformers.js — first use downloads ~40 MB and caches it afterwards. No keys, no network, no Google service. The mic button shows a small `OFF` badge when the offline engine is active. Plain HTTP dev on `localhost:3000` is fine — Chrome treats `localhost` as a secure context, so the mic works there. Themes under `/journal` are computed locally and need no key, never leave the device. Tapping a theme filters the journal for it. `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey); `GEMINI_MODEL` optional (defaults to `gemini-3.5-flash`, free-tier eligible — the 3.x family is thinking-native, so the client budgets extra tokens for short outputs).

Both are provisioned automatically (idempotent) by:

```sh
node --env-file=.env scripts/setup-days.mjs
```

Scripts: `dev` — `build` — `start` — `lint` — `test` — `typecheck` — `check` (all checks).

## What's inside

- `/auth` — email-code sign-in (6-digit code, no password)
- bell icon (navbar) — inbox panel: grouping, unread badge, mark read/all-read
- `/` — greeting + **year in dots** (365-day journal: hollow dot, tap to write/edit/erase, “on this day” flashback, `/api/days*`)
- `/journal` — reading mode (every entry as one book, year dividers, search-within + last-30-days themes, tap to expand as a card)
- `/brain` — capture-to-do organ: dump "I need to…" lines, mic capture, check off, AI tidy (dedupe + rewrite, Mono AI gate), open-count nudge with Telegram
- `/profile` — identity card (initials avatar, name, email, member since) + edit
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
