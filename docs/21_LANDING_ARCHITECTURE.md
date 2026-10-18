# Landing + waitlist architecture

Last updated: 2026-10-18

## Verdict (short)

One Supabase project (`voiceToWork` / `ubqhyeicmgmdzethtids`) backs everything. The landing site is a separate Vite React app that only writes waitlist rows. Product accounts stay in Supabase Auth and are created when someone signs up in the Expo app (web today, App Store / Play Store later). No second database.

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
| Landing | Vite + React in `LandingPage/` (static host: Vercel/Netlify/etc.) |
| Product UI | Existing Expo app (dashboard already in progress) |
| Secrets | Only publishable/anon key in the landing `.env`; never service_role |

Growth path without rewrite: Edge Function for invite mail (Resend), rate limits, admin list UI, optional waitlist→user conversion flag.

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
