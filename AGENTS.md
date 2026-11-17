# Mono — agent notes

Minimal app base: Next.js 16 (App Router) + Appwrite. TypeScript strict, zod everywhere, no `any`.

## Verify

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run build       # next build (needs .env present; Appwrite is not called at build time)
```

`npm run check` runs all four. CI: `.github/workflows/check.yml` runs the same on every push/PR (build uses a dummy env — Appwrite is never hit at build time).

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
- Settings page edits `users.name` (rowId = account id), not the Appwrite auth name.
- Telegram tables are `telegram` (connections) and `codes` (one-time link codes, sha256 hashed). Deleting either breaks the link flow.
- The `days` table holds the year-in-dots journal: one row per `user` per `day` (`YYYY-MM-DD`), deterministic row id = sha256(`user:day`).slice(0,32), so upserts are id-based. Delete the `days` table and the journal is gone.
- The `timeline` table holds Check: one row per (`user`, `bucket`, `text`, `order`, `done`) — the table name is kept for data continuity. Three fixed buckets — rise · midday · evening — no custom config. Default items seeded on first load. Delete the table and Check is gone too.
- `/check/satisfy` + `/check/reset` are the only Check mutations outside `/api/check` itself — both gated to same-origin and `getAuthAccount`. `/today` and `/checklist` (page + API) redirect to `/check`; the `timeline` table keeps its name.
- `/api/cron/nudge` (hourly GitHub Actions ping at :00, or Vercel cron on Pro; `Authorization: Bearer $CRON_SECRET`) sends the evening Telegram nudge at each user's LOCAL 10:00pm (`users.tz`, synced silently from the browser; falls back to UTC) to users with `nudge=true` who haven't written today, and drops the same moment into the bell (`day_ending` notification, Sunset icon, ref `/`). The nudge line is computed locally from recurring themes in their recent entries (`features/digest/compile.ts`) — no AI, no key. Vercel Hobby only permits daily crons — do not put an hourly schedule in `vercel.json` (deploy fails).
- `/api/cron/letter` (Sunday 09:00 UTC) sends opted-in `ai=true` users a weekly letter compiled locally from their last 7 days (words, longest day, themes, satisfaction average, their own longest stand-out line), via Telegram.
- No AI anywhere. Everything is computed on-device/on-server from the user's entries (themes, digest, nudge, polish) — `ai` on `users` is the opt-in flag for the Sunday letter only. `/journal` themes are local-only (frequency count minus stopwords, bigrams included). Dictation is the Web Speech API; polish is a deterministic local tidy.
- The Telegram BotFather webhook + menu button are registered once per deployment on the deployed URL. No npm scripts manage that here — if you need to re-register, use the Telegram API directly.
- Notifications are delivered in-app + forwarded to Telegram (best-effort, inside `notify()` via `after()`). Nothing else pushes.
- Avatar storage is the `mono` bucket (`APPWRITE_STORAGE_BUCKET_ID`) — one file per user, id kept on `users.avatar` (empty string = none). Served auth-gated via `GET /api/avatar?id=<fileId>` (immutable cache); upload/replace/remove via `POST`/`DELETE /api/users/avatar`; replaced and removed files are deleted best-effort. `UserAvatar` falls back to initials if the file is missing or fails to load.
