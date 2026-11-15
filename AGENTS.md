# Mono — agent notes

Minimal app base: Next.js 16 (App Router) + Appwrite. TypeScript strict, zod everywhere, no `any`.

## Verify

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run build       # next build (needs .env present; Appwrite is not called at build time)
```

`npm run check` runs all four.

Toasts: `import { toast } from "sonner"` — `<Toaster />` is mounted in the root layout. Vercel Analytics is mounted too (no config needed).

## Hard rules

- Imports use `@/*` (repo root).
- `components/interface/*` = composed client experiences; `components/ui/*` = primitives; pages in `app/(app)/` are server components wrapped in `<Suspense>` (the app uses `cacheComponents`).
- `features/<name>/{service,store,schemas,client-api,types}.ts` — services are server-only (`import "server-only"`), take explicit ids, never read cookies. Client state lives in `store.ts` (zustand) and talks to `/api/*` via `client-api.ts`.
- **Table/attribute names: one lowercase word.** Never add snake_case or camelCase columns. Appwrite system fields (`$id`, `$createdAt`) excepted.
- API route shape: `isSameOrigin` (mutations) → `getAuthAccount` → zod `safeParse` (`.strict()`) → service → `NextResponse`. Errors: `logFailure(...)` + `jsonError(status, CODE, msg)`.
- `notify(recipient, actor, type, ref?)` in `features/notifications/service.ts` is the one-call API to notify. It skips self-notifications and best-effort forwards to Telegram.
- Notifications `type` is a past-tense verb phrase ("followed you"); render as `${actorName} ${type}`.
- Auth = Appwrite email token (6-digit code). Session cookie name is `a_session_<APPWRITE_PROJECT_ID>`; `proxy.ts` redirects unauthenticated page views to `/auth`.

## Gotchas

- One chrome, everywhere: a sticky white-ish navbar (Mono logo = home · centered Home/Journal pill on `md+` · bell with unread badge · avatar dropdown with Profile/Journal/Dark mode/Settings/Sign out). `/auth` intentionally renders without chrome.
- Base UI dropdown: `DropdownMenuLabel` renders `Menu.GroupLabel` and **must** sit inside `<DropdownMenuGroup>`, or the app throws `MenuGroupContext is missing` when the menu opens.
- Settings page edits `users.name` (rowId = account id), not the Appwrite auth name. `/api/auth/me` still returns the auth account as-is.
- Telegram tables are `telegram` (connections) and `codes` (one-time link codes, sha256 hashed). Deleting either breaks the link flow.
- The `days` table holds the year-in-dots journal: one row per `user` per `day` (`YYYY-MM-DD`), deterministic row id = sha256(`user:day`).slice(0,32), so upserts are id-based. Delete the `days` table and the journal is gone.
- `/api/cron/nudge` (Vercel cron, 20:00 UTC, `Authorization: Bearer $CRON_SECRET`) sends the evening Telegram nudge to users with `nudge=true` on the `users` row who haven't written today (UTC date). With `ai=true`, the nudge text is a Gemini-generated question grounded in their recent entries (`GEMINI_API_KEY` required; falls back to a generic line on error).
- `/api/cron/letter` (Sunday 09:00 UTC) sends opted-in `ai=true` users a ~130-word weekly letter compiled by Gemini from their last 7 days, via Telegram.
- Mono AI = one opt-in flag (`ai` on `users`) covering letter + smarter nudge + year review — everything that uploads entries to Google Gemini. `/journal` themes are local-only (frequency count minus stopwords, bigrams included) — no key, no network.
- The Telegram BotFather webhook + menu button are registered once per deployment on the deployed URL. No npm scripts manage that here — if you need to re-register, use the Telegram API directly.
- Notifications are delivered in-app + forwarded to Telegram (best-effort, inside `notify()` via `after()`). Nothing else pushes.
- Users have no avatar storage — `UserAvatar` renders initials. Re-adding photo upload means restoring storage + an `avatar` column on `users`.
