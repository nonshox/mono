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

`users` also needs a `nudge` (bool, default false) attribute for the optional evening Telegram nudge (`/api/cron/nudge`, Vercel cron at 20:00 UTC, requires `CRON_SECRET`).

Both are provisioned automatically (idempotent) by:

```sh
node --env-file=.env scripts/setup-days.mjs
```

Scripts: `dev` — `build` — `start` — `lint` — `test` — `typecheck` — `check` (all checks).

## What's inside

- `/auth` — email-code sign-in (6-digit code, no password)
- bell icon (navbar) — inbox panel: grouping, unread badge, mark read/all-read
- `/` — greeting + **year in dots** (365-day journal: hollow dot, tap to write/edit/erase, “on this day” flashback, `/api/days*`)
- `/journal` — reading mode (every entry as one book, year dividers, search-within, tap to edit)
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
