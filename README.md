# Mono

A minimal, private base for your next app — Next.js 16 (App Router, React 19, Tailwind 4) with an Appwrite backend, email-code auth, a generic notifications system, and a Telegram connection. Clone it, rename it, ship your idea.

## Stack

- **Next.js 16** · App Router · React Server Components · `cacheComponents`
- **React 19** · **TypeScript** (strict)
- **Tailwind CSS 4** · shadcn-style UI (`components/ui`)
- **Appwrite** (node-appwrite) — tables, storage, auth via email token
- **Zod** — input validation · **Vitest** — unit tests · **Zustand** — client state

## Quickstart

```sh
cp .env.example .env    # fill in your Appwrite project values
npm install
npm run dev
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` · `test` · `check` (all of them).

Routes: `/auth` (sign in), `/` (home), `/notifications`, `/settings` (name · Telegram · sessions).

## Layout

```
app/
  (app)/            # authenticated area (top bar / mobile nav shell)
    page.tsx        # home
    notifications/  # notifications page
    settings/       # account, telegram, sessions
  api/              # route handlers (thin: auth check → service call)
  auth/             # public sign-in screen
components/
  ui/               # design system primitives (button, card, input…)
  interface/        # composed experiences (settings, notifications, shell…)
features/
  auth/             # email-code sign-in, session helpers, zod schemas
  users/            # users row: email + name (rowId = auth account id)
  notifications/    # generic notifications: notify(), list, mark-read
  telegram/         # telegram link/unlink + webhook + delivery
lib/
  http.ts           # jsonError, isSameOrigin, getAuthAccount, logFailure
  appwrite/
    server.ts       # admin/account clients, cookie helpers
    tables.ts       # getTables, getDatabaseId, runTransaction
```

## Conventions

- **Import alias** `@/*` → repo root. Server-only code imports `"server-only"`.
- **Tables & attributes are one lowercase word** (`users`, `notifications`, `telegram`, `codes`; attrs like `recipient`, `actor`, `ref`, `read`). No snake_case, no multi-word columns — that includes future tables.
- **`users` row id = the auth account `$id`**. One-to-one, no join table.
- **Notifications `type`** is a past-tense verb phrase ("followed you", "liked your post"): clients render `${actorName} ${type}`. Grouping collapses same actor+type within 24h.
- **API routes** stay thin: `getAuthAccount` → zod parse → service → `jsonError` on failure. Services never read cookies; they take explicit ids.
- **Env names stay as Appwrite docs define them** — see `.env.example`.

## Appwrite tables

| Table | Attributes | Indexes |
|---|---|---|
| `users` | `email` · `name` | — (rowId = account id) |
| `notifications` | `recipient` · `actor` · `type` · `ref` · `read` | `recipient` |
| `telegram` | `user` · `member` · `chat` · `created` | `user`, `member` (unique) |
| `codes` | `user` · `hash` · `expires` · `used` | `hash` |

Create these in your own Appwrite project, or `AppwriteException 404` at runtime until you do.
