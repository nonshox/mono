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
- **Never hand-roll controls.** Every visible control renders a `components/ui/*` shadcn primitive adapted with `cn()` (`Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Button`, `FileInput` for hidden uploads). Raw `<input>/<textarea>/<select>/<button>` are banned outside `components/ui/` — enforced by a `no-restricted-syntax` error in `eslint.config.mjs`.
- `components/features/<name>/*` = composed client experiences for a feature page, split into separated files, kebab-case (`check/`, `journal/`, `stash/`, `home/`, `settings/`, `profile/`, `auth/` — each page owns its folder). `components/shared/*` = cross-feature composed pieces (shell, notification-bell, user-avatar, page-loader, mic/polish buttons, progress-ring, local-date-time, empty-state). `components/ui/*` = shadcn-style primitives. `components/interface/` does not exist — do not recreate it. Pages in `app/(app)/` are server components wrapped in `<Suspense>` (the app uses `cacheComponents`).
- **Client state in zustand `features/<name>/store.ts`.** Components subscribe to slices and call actions directly — do not drill dozens of handler props through component trees. Props stay for server-fetched data and the few view props a leaf needs.
- `features/<name>/{service,store,schemas,client-api,types}.ts` — services are server-only (`import "server-only"`), take explicit ids, never read cookies. Client state lives in `store.ts` (zustand) and talks to `/api/*` via `client-api.ts`.
- **Table/attribute names: one lowercase word.** Never add snake_case or camelCase columns. Appwrite system fields (`$id`, `$createdAt`) excepted.
- API route shape: `isSameOrigin` (mutations) → `getAuthAccount` → zod `safeParse` (`.strict()`) → service → `NextResponse`. Errors: `logFailure(...)` + `jsonError(status, CODE, msg)`.
- `/stash` (formerly `/library`) is the only app page reachable without auth - it's IndexedDB-only (`mono-stash`, migrated once from `mono-library`; DB version 2 with `books` + `words` object stores), nothing is sent to the server, so the proxy matcher deliberately omits it. Tabs: Books (files) and Words (vocabulary + local flashcard practice).
- Notifications are Mono-native system events, not actor-based social. Three kinds exist: `dot_closed`, `letter_ready`, `day_ending`. Tap destination is derived from `kind` (letter_ready → `/journal`, dot_closed/day_ending → `/`). `createNotification()` in `features/notifications/service.ts` is the single write path. Read/red rows show as passive rows in the bell; unread rows tap to navigate.
- Auth = Appwrite email token (6-digit code). Session cookie name is `a_session_<APPWRITE_PROJECT_ID>`; `proxy.ts` redirects unauthenticated page views to `/auth`.

## Gotchas

- One chrome, everywhere: a sticky white-ish navbar (Mono logo = home · centered Home/Journal pill on `md+` · bell with unread badge · avatar dropdown with Profile/Journal/Dark mode/Settings/Sign out). `/auth` intentionally renders without chrome.
- Base UI dropdown: `DropdownMenuLabel` renders `Menu.GroupLabel` and **must** sit inside `<DropdownMenuGroup>`, or the app throws `MenuGroupContext is missing` when the menu opens.
- Settings page edits `users.name` (rowId = account id), not the Appwrite auth name.
- Telegram tables are `telegram` (connections) and `codes` (one-time link codes, sha256 hashed). Deleting either breaks the link flow.
- The `days` table holds the year-in-dots journal: one row per `user` per `day` (`YYYY-MM-DD`), deterministic row id = sha256(`user:day`).slice(0,32), so upserts are id-based. Delete the `days` table and the journal is gone.
- The `timeline` table holds Check: one row per (`user`, `bucket`, `text`, `order`, `done`) - the table name is kept for data continuity. Three fixed buckets - rise · midday · evening - no custom config. Default items seeded on first load. Delete the table and Check is gone too.
- The `books` table holds the Reading Journey on `/journal`: one row per finished book the user logs (`user`, `title`, `author`, `note` (strings), `days` (int, optional); `$createdAt` is the log date). `scripts/setup-books.mjs` provisions it (idempotent, key on `user`). Service `features/books/service.ts`; mutations via `/api/books` (GET/POST/PATCH/DELETE, same-origin + `getAuthAccount` + zod `.strict()`). Ownership is checked server-side on update/delete.
- `/check/satisfy` + `/check/reset` are the only Check mutations outside `/api/check` itself — both gated to same-origin and `getAuthAccount`. `/today` and `/checklist` (page + API) redirect to `/check`; the `timeline` table keeps its name.
- `/api/cron/nudge` (hourly GitHub Actions ping at :00, or Vercel cron on Pro; `Authorization: Bearer $CRON_SECRET`) sends the evening Telegram nudge at each user's LOCAL 10:00pm (`users.tz`, synced silently from the browser; falls back to UTC) to users with `nudge=true` who haven't written today, and drops the same moment into the bell (`day_ending` notification, Moon icon, ref `/check`). The nudge line is computed locally from recurring themes in their recent entries (`features/digest/compile.ts`) — no AI, no key. Vercel Hobby only permits daily crons — do not put an hourly schedule in `vercel.json` (deploy fails).
- `/api/cron/letter` (Sunday 09:00 UTC) sends opted-in `ai=true` users a weekly letter compiled locally from their last 7 days (words, longest day, themes, satisfaction average, their own longest stand-out line), via Telegram.
- No AI anywhere. Everything is computed on-device/on-server from the user's entries (themes, digest, nudge, polish) — `ai` on `users` is the opt-in flag for the Sunday letter only. `/journal` themes are local-only (frequency count minus stopwords, bigrams included). Dictation is the Web Speech API; polish is a deterministic local tidy.
- The Telegram BotFather webhook + menu button are registered once per deployment on the deployed URL. No npm scripts manage that here — if you need to re-register, use the Telegram API directly.
- Notifications are delivered in-app (the bell). The 10:00pm nudge also sends via Telegram when the user has a Telegram connection (`telegram` table); the Sunday letter goes to opted-in `ai=true` users. Nothing else pushes.
- Avatar storage is the `mono` bucket (`APPWRITE_STORAGE_BUCKET_ID`) — one file per user, id kept on `users.avatar` (empty string = none). Served auth-gated via `GET /api/avatar?id=<fileId>` (immutable cache); upload/replace/remove via `POST`/`DELETE /api/users/avatar`; replaced and removed files are deleted best-effort. `UserAvatar` falls back to initials if the file is missing or fails to load.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
