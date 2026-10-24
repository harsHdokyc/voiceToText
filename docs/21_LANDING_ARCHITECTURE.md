# Landing + waitlist architecture

Last updated: 2026-10-24

## Verdict (short)

One Supabase project (`voiceToWork` / `ubqhyeicmgmdzethtids`) backs everything. The landing site is a separate Vite React app that only writes waitlist rows. Product accounts stay in Supabase Auth and are created when someone signs up in the Expo app (web today, App Store / Play Store later). No second database.

**Deploy status (2026-10-24):** Two Vercel projects share repo `harsHdokyc/voiceToText` / branch `main`:

| Surface | Vercel project | Production URL |
|---|---|---|
| Marketing + waitlist | `voice-to-text` (Root Directory `LandingPage`) | https://saydooo.vercel.app/ |
| Product (Expo web) | `getsaydo` (repo root) | https://getsaydo.vercel.app/ |

Sign-in on the landing site uses `VITE_APP_URL` → product app. See [Deployment (Vercel)](#deployment-vercel) and [20_STATUS.md](./20_STATUS.md).

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

Two projects on the same GitHub repo. Do **not** point both at the same Root Directory — marketing stays under `LandingPage/`; the product app builds from the repo root.

### A. Marketing (`voice-to-text`)

| Setting | Value |
|---|---|
| Repo | `harsHdokyc/voiceToText` |
| Production branch | `main` |
| Root Directory | **`LandingPage`** (required) |
| Install | `npm install` / `npm ci` |
| Build | `npm run build` |
| Output | `dist` |
| Framework | Vite |
| Production URL | https://saydooo.vercel.app/ |
| SPA routing | `LandingPage/vercel.json` → `/index.html` |

Env (build-time; Vite inlines `VITE_*`):

```env
VITE_SUPABASE_URL=https://ubqhyeicmgmdzethtids.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
VITE_APP_URL=https://getsaydo.vercel.app
```

Without the Supabase vars, the waitlist form cannot insert. Without `VITE_APP_URL`, Sign in falls back to `/early-access` on the marketing site.

### B. Product Expo web (`getsaydo`)

| Setting | Value |
|---|---|
| Repo | `harsHdokyc/voiceToText` |
| Production branch | `main` |
| Root Directory | **repo root** (`.`) — not `LandingPage` |
| Install | `npm ci` |
| Build | `npx expo export --platform web` (or `npm run web:export`) |
| Output | `dist` |
| Framework | None (static Expo export; `app.json` → `web.output: "single"`) |
| Production URL | https://getsaydo.vercel.app/ |
| Legacy alias | `saydo-app.vercel.app` (still attached; prefer `getsaydo`) |
| SPA routing | Root `vercel.json` rewrites paths **except** `/_expo/` and `/assets/` → `/index.html`. A catch-all that includes `_expo` will serve HTML for JS bundles and blank the app. |
| Deployment Protection | Off for production (public sign-in). |

Env (build-time; Expo inlines `EXPO_PUBLIC_*`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://ubqhyeicmgmdzethtids.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
```

After changing the product URL: add `https://getsaydo.vercel.app` (and any custom domain) under Supabase → Authentication → URL configuration (Site URL / Redirect URLs).

`saydo.vercel.app` was unavailable (owned elsewhere). Long-term shape is a custom domain such as `app.saydo.com` on the `getsaydo` project — not nested `app.*.vercel.app`.

### Shipped on the marketing site (code on `main`)

- Marketing pages (home, product, how-it-works, pricing, about, FAQ, early access, privacy, terms, sign-in stub)
- Early-access waitlist → `public.waitlist`
- Saydo brand / mark
- Scroll-driven how-it-works journey
- Lenis smooth scrolling (Motion frame-driven; respects reduced motion)
- Sign in → `VITE_APP_URL` (product Expo web)

### Deploy timeline (progress)

| When | Commit / event | Result |
|---|---|---|
| Pre-landing | Expo-only; marketing deferred | N/A |
| Landing scaffold | `9925b7f` … | App in `LandingPage/` |
| Config / Vite ESM fix | `62e705e` + PR #2 → `f3c3219` | **Vercel build green**, site deployed |
| Lenis | `b134cf4` | Smooth scroll on `main` |
| tsconfig include `vite.config.ts` | `e9b19b1` | **Build red** — `Cannot find module 'node:url'` during `tsc -b` |
| Revert include to `src` only | `3dbf7e9` | **Build green** again |
| Expo web on Vercel | 2026-10-24 | Project `getsaydo`; https://getsaydo.vercel.app/; landing `VITE_APP_URL` wired |

Keep `LandingPage/tsconfig.json` `"include": ["src"]` only. Do not typecheck `vite.config.ts` in `prebuild` unless `@types/node` is added on purpose.

### SPA refresh (404 NOT_FOUND)

**Landing:** client routes (`/pricing`, `/early-access`, …) need `LandingPage/vercel.json` → `index.html`.

**Product:** Expo Router routes (`/sign-in`, …) need root `vercel.json` (or equivalent project routes) that rewrite to `index.html` **without** rewriting `/_expo/static/...` JS/CSS. Hard refresh on `/sign-in` otherwise returns Vercel `404 NOT_FOUND`, or a bad catch-all serves HTML as JS.

### Known non-blocking noise

During `vite build`, esbuild may warn that parent `../tsconfig.json` extends missing `expo/tsconfig.base` (Expo app lives at repo root; Vercel only installs `LandingPage` deps). Safe to ignore if the build completes.

### Docker (self-host / local prod check)

`LandingPage/Dockerfile` runs the same `npm run build` and serves `dist/` with nginx (`try_files … /index.html`). Root `Dockerfile` runs `expo export --platform web` for the portal. `docker-compose.yaml` maps portal → :3000, landing → :8080. Vercel is the production host for both surfaces; Docker is an alternative, not a replacement.

### Ops still open

1. Smoke waitlist on https://saydooo.vercel.app/early-access (new email + duplicate).
2. Smoke product sign-up / sign-in on https://getsaydo.vercel.app/sign-in against hosted Auth.
3. Confirm Supabase Auth allowlist includes `https://getsaydo.vercel.app`.
4. Optional custom domains (`saydo.com` marketing, `app.saydo.com` product).
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
