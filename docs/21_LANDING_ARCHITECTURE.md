# Landing + waitlist architecture

Last updated: 2026-10-19

## Verdict (short)

One Supabase project (`voiceToWork` / `ubqhyeicmgmdzethtids`) backs everything. The landing site is a separate Vite React app that only writes waitlist rows. Product accounts stay in Supabase Auth and are created when someone signs up in the Expo app (web today, App Store / Play Store later). No second database.

**Deploy status (2026-10-19):** Marketing app is live on **Vercel** from repo root folder `LandingPage/` on `main`. Waitlist inserts hit hosted Supabase. See [Deployment (Vercel)](#deployment-vercel) below and [20_STATUS.md](./20_STATUS.md).

## Answers

### 1. Same database or separate?

**Same database.** Hosted project already has Auth, `profiles`, notes, tasks, reminders. A `waitlist` table is a small addition there. A separate DB would duplicate ops, keys, and email identity for no gain.

### 2. How do landing, web app, and mobile share backend / accounts?

```
Marketing site (LandingPage / Vite)
  → anon key → insert waitlist only

Expo app (web + iOS + Android)
  → same URL + publishable key
  → Auth (email/password + OTP)
  → profiles / notes / tasks / Edge Functions
```

- **One Auth pool:** `auth.users` is the account system for every client.
- **Waitlist ≠ account:** joining the list does not create a login. Invite / open beta later can match on email when they sign up.
- **Mobile:** same Expo codebase already targets native; store builds talk to the same Supabase project.

### 3. Waitlist vs product access (web then stores)

1. User joins waitlist on the marketing site (email + optional first name).
2. You invite or open access (ops / email) when ready.
3. User signs up in the **product app** (Expo web or native) with that email → Auth user + `profiles` row.
4. Optional later: mark waitlist row `converted_at` when a matching Auth user appears (not required for V1).

### 4. Simplest architecture that still grows

| Piece | Choice |
|---|---|
| Backend | Existing Supabase project only |
| Waitlist | `public.waitlist` + RLS: public **insert**, no public read/update/delete |
| Landing | Vite + React in `LandingPage/` — **hosted on Vercel** |
| Product UI | Existing Expo app (dashboard already in progress) |
| Secrets | Only publishable/anon key in the landing env; never service_role |

Growth path without rewrite: Edge Function for invite mail (Resend), rate limits, admin list UI, optional waitlist→user conversion flag.

## Deployment (Vercel)

### Configuration

| Setting | Value |
|---|---|
| Repo | `harsHdokyc/voiceToText` |
| Production branch | `main` |
| Root Directory | **`LandingPage`** (required — do not build from repo root) |
| Install | `npm install` (default) |
| Build | `npm run build` |
| Output | `dist` (Vite default) |
| Framework | Vite |
| Production URL | https://saydooo.vercel.app/ |
| SPA routing | `vercel.json` rewrites non-asset paths → `/index.html` (required for refresh on `/pricing`, etc.) |

Local / Vercel env (build-time; Vite inlines `VITE_*`):

```env
VITE_SUPABASE_URL=https://ubqhyeicmgmdzethtids.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
VITE_APP_URL=<optional Expo/product web URL for Sign in>
```

Set the same names in the Vercel project → Settings → Environment Variables (Production + Preview). Without them, the waitlist form builds but cannot talk to Supabase.

### Shipped on the site (code on `main`)

- Marketing pages (home, product, how-it-works, pricing, about, FAQ, early access, privacy, terms, sign-in stub)
- Early-access waitlist → `public.waitlist`
- Saydo brand / mark
- Scroll-driven how-it-works journey
- Lenis smooth scrolling (Motion frame-driven; respects reduced motion)

### Deploy timeline (progress)

| When | Commit / event | Result |
|---|---|---|
| Pre-landing | Expo-only; marketing deferred | N/A |
| Landing scaffold | `9925b7f` … | App in `LandingPage/` |
| Config / Vite ESM fix | `62e705e` + PR #2 → `f3c3219` | **Vercel build green**, site deployed |
| Lenis | `b134cf4` | Smooth scroll on `main` |
| tsconfig include `vite.config.ts` | `e9b19b1` | **Build red** — `Cannot find module 'node:url'` during `tsc -b` |
| Revert include to `src` only | `3dbf7e9` | **Build green** again |

Keep `LandingPage/tsconfig.json` `"include": ["src"]` only. Do not typecheck `vite.config.ts` in `prebuild` unless `@types/node` is added on purpose.

### SPA refresh (404 NOT_FOUND)

Client routes (`/pricing`, `/early-access`, …) have no matching files in `dist/`. Without a rewrite, a hard refresh hits Vercel’s file server → `404 NOT_FOUND`. `LandingPage/vercel.json` sends those requests to `index.html` so React Router can render the page.

### Known non-blocking noise

During `vite build`, esbuild may warn that parent `../tsconfig.json` extends missing `expo/tsconfig.base` (Expo app lives at repo root; Vercel only installs `LandingPage` deps). Safe to ignore if the build completes.

### Ops still open

1. Confirm Production + Preview env vars on Vercel match hosted Supabase.
2. Smoke early-access form on the deployed URL (success + duplicate email).
3. Point a custom domain when ready.
4. Set `VITE_APP_URL` to the real product web URL before public traffic.
5. Optional: invite / conversion workflow (see growth path above).

## Data flow (waitlist)

1. Form validates email (+ optional first name) client-side (Zod).
2. `insert` into `waitlist` with lowercased email.
3. Unique index on `lower(email)` → Postgres `23505` → UI “already on the list”.
4. Success → confirmation UI; no session created.

## What we are not doing

- Separate waitlist SaaS / second Supabase project
- Creating Auth users from the landing form
- Porting the Expo workspace into the marketing site
- Shipping the Lovable “demo sign-in → fake dashboard” path as real auth
