# Sentry — client crash, error & performance monitoring (plan)

**Status:** not started · **When:** before first build goes to beta testers / store · **Scope:** Expo app + Edge Functions  
**Why:** Client `[vtw]` logs (`logger`, `withApiLog`) only reach Metro/device console — invisible once the app is on someone else's phone. Edge `[vtw]` logs land in Supabase logs, but Supabase never alerts on them. Sentry gives one place with email alerts for both.

Related: [16_LOGGING_COMBINED.md](./16_LOGGING_COMBINED.md), [08_SECURITY_AND_PRIVACY.md](./08_SECURITY_AND_PRIVACY.md), [18_LEFTOVER.md](./18_LEFTOVER.md).

---

## What we get

| Feature | Example | Phase |
|---|---|---|
| JS crashes / unhandled errors | `TypeError` in capture sheet, stack mapped to `.tsx` line | 1 |
| Native crashes | Recorder dies on a Samsung model | 1 |
| Handled API failures | `withApiLog` fail → `code: upload_failed`, `reason: network timeout` | 1 |
| Frequency / users affected | "42 events · 9 users" | 1 |
| Grouping | Same error merged into one issue | 1 |
| Device context | App version, OS, device model, network | 1 |
| Breadcrumbs (scrubbed) | Screens + taps before the error; no URLs/tokens/transcripts | 1 |
| Release health | Crash-free users per release | 1 |
| Alerts | Email on new issue / spike | 1 |
| Edge Function errors | `process-note` fail → `code: transcription_failed`, `reason: provider 503` → email | 1b |
| API operation timing | `notes.upload` p95 = 4.2s, by device/network | 2 |
| Slow screens | Time-to-initial-display per route (e.g. note detail 1.8s) | 2 |
| App start time | Cold/warm start duration per release | 2 |
| Slow / frozen frames | Janky lists, capture sheet animation | 2 |

## What we never send / don't use

| Excluded | Why |
|---|---|
| Audio, transcripts, prompts, tokens, signed URLs, emails | Privacy rules ([08](./08_SECURITY_AND_PRIVACY.md), logging rule) — scrubbed in `beforeSend` / `beforeBreadcrumb` |
| Session replay | Records screen content (transcripts) — stays **off** |
| Profiling | Not needed for V1 |
| Postgres / Auth / Storage errors | Only reachable via Supabase Log Drains (Pro plan + add-on) — later, not V1 |
| Local dev events | `enabled` only in production builds |
| Trace headers to Supabase | `tracePropagationTargets: []` — avoids CORS preflight issues on Edge Functions |

---

## Phase 1 — errors & crashes

### 1. Accounts / secrets (manual)

- Create Sentry org + project (platform: React Native). Free tier ≈ 5k errors/mo.
- Env vars:

| Var | Where | Secret? |
|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | `.env` / EAS env | No (DSN is client-safe) |
| `SENTRY_AUTH_TOKEN` | EAS secret only — **never** in `.env` committed or client | **Yes** (source-map upload) |

### 2. Install

```bash
npx expo install @sentry/react-native
```

`app.json` → `plugins`:

```json
["@sentry/react-native/expo", { "organization": "<org>", "project": "<project>" }]
```

`metro.config.js` (create if missing) — needed for source maps:

```js
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
module.exports = getSentryExpoConfig(__dirname);
```

Source maps upload automatically on EAS builds when `SENTRY_AUTH_TOKEN` is set. Requires a dev/prod build (not Expo Go) for native crash capture.

### 3. Init — `src/lib/sentry.ts`

```ts
import * as Sentry from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry-scrub';

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  attachScreenshot: false,
  attachViewHierarchy: false,
  tracePropagationTargets: [],
  tracesSampleRate: 0, // Phase 2 → 0.2
  integrations: [navigationIntegration],
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});

export { Sentry };
```

### 4. Pure scrub helpers — `src/lib/sentry-scrub.ts` (+ side-by-side test)

Rules (reuse `sanitizeLogFields` from `src/lib/logger.ts` for key redaction — don't duplicate the key list):

- `scrubBreadcrumb`: drop `console` category (our `[vtw]` lines are already in Metro; avoids double data); for `http`/`fetch`/`xhr` strip query string from `data.url` (signed URLs live in `?token=`); drop request/response bodies.
- `scrubEvent`: delete `event.request.data`, `event.request.cookies`, `event.request.headers`; strip query strings from `event.request.url`; run `sanitizeLogFields` on `event.extra` and `event.contexts`; keep `event.user` to `{ id }` only.
- `shouldReportApiError(code)`: `false` for user-caused codes (validation, wrong credentials, offline) → breadcrumb only; `true` otherwise.

Tests (`test/lib/sentry-scrub.test.ts`) must assert real outputs, e.g.:
- signed storage URL with `?token=abc` → URL without query
- event with `extra.transcript` → key removed
- `console` breadcrumb → `null`
- `validation_failed` → not reported; `upload_failed` → reported

### 5. Wire-up points

| File | Change |
|---|---|
| `app/_layout.tsx` | `import '@/lib/sentry'` first; `export default Sentry.wrap(RootLayout)`; register nav: `navigationIntegration.registerNavigationContainer(useNavigationContainerRef())` (from `expo-router`) |
| `src/lib/with-api-log.ts` | In `catch`: if `shouldReportApiError(code)` → `Sentry.captureException(error, { tags: { scope, code }, extra: { reason } })` |
| `src/providers/auth-provider.tsx` | On session change: `Sentry.setUser(session ? { id: user.id } : null)` — UUID only, no email |

No other call sites — `withApiLog` already wraps every client API op, so all services report for free.

### 6. Verify

- [ ] Prod/preview build: throw a test error from a hidden settings button → appears in Sentry with readable `.tsx` stack
- [ ] Force a native crash (`Sentry.nativeCrash()`) → appears after relaunch
- [ ] Inspect a captured upload failure event: no signed URL query, no transcript, no auth header, user = UUID only
- [ ] Dev build (`npm start`) sends nothing
- [ ] Alert rule: email on new issue

---

## Phase 1b — Edge Function errors

Same Sentry org, separate project (`voicetotext-edge`, platform: Deno) so server issues don't mix with app issues. Shares the free-tier quota.

### 1. Secret (manual)

```bash
supabase secrets set SENTRY_DSN=<edge project DSN>
```

Server-side only — never in `.env` / `EXPO_PUBLIC_*`.

### 2. Init — `supabase/functions/_shared/sentry.ts`

```ts
import * as Sentry from "npm:@sentry/deno";

const dsn = Deno.env.get("SENTRY_DSN");

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: "production",
  sendDefaultPii: false,
  defaultIntegrations: false, // Edge isolates are shared; no global handlers
  tracesSampleRate: 0,
});

export { Sentry };
```

### 3. Wire-up points

| File | Change |
|---|---|
| `supabase/functions/_shared/log.ts` | In `edgeLog`, when `level === "error"`: `Sentry.captureMessage(\`${scope}: ${code}\`, { level: "error", tags: { scope, code }, extra: sanitize(fields) })`. Every function already logs failures through `edgeLog`, so all report for free. Reuses existing `sanitize()` — no transcripts/tokens/signed URLs leave. |
| Each `supabase/functions/*/index.ts` handler | Wrap body in `try/catch` → `Sentry.captureException(err, { tags: { scope } })` for crashes that never reach `edgeLog`; then `await Sentry.flush(2000)` before returning the response (isolate may stop right after responding and drop queued events). |

Rules:
- Use a per-request scope (`Sentry.withScope`), not global `setTag`/`setUser` — isolates serve many requests.
- Only report real server failures. User-caused codes (`validation_failed`, `unauthorized`, `not_found`) stay log-only.
- User = `{ id }` UUID only, when known.

### 4. Verify

- [ ] `health` function (or a temporary throw) in deployed project → issue appears in `voicetotext-edge`
- [ ] Event has `scope` + `code` tags and `reason`; no transcript, auth header, signed URL, or audio
- [ ] Alert rule on `voicetotext-edge`: email on new issue + on regression
- [ ] Local `supabase functions serve` without `SENTRY_DSN` sends nothing

### Not covered (known gap)

- Postgres / Auth / Storage errors — need Supabase Log Drains (Pro plan). Revisit after V1.
- Edge timeouts / isolate OOM kills — the process dies before Sentry can send; watch Supabase Edge logs for these.

---

## Phase 2 — performance & slow screens

Turn on after Phase 1 is stable and real users exist.

| Change | Where |
|---|---|
| `tracesSampleRate: 0.2` (raise to 1.0 during small beta) | `src/lib/sentry.ts` |
| Span per API op: wrap `fn()` with `Sentry.startSpan({ name: scope, op: 'api' }, fn)` | `src/lib/with-api-log.ts` |
| Screen load timing (TTID) | Already on via `enableTimeToInitialDisplay` |
| Time-to-full-display on data-heavy screens: `<Sentry.TimeToFullDisplay record={!isLoading} />` | `notes/[noteId].tsx`, `notes/index.tsx`, `tasks/index.tsx` |
| App start + slow/frozen frames | Automatic once tracing is on (native build) |

Keep `tracePropagationTargets: []` — Edge timing is already in Supabase logs.

Watch: free tier span quota; lower sample rate if exceeded.

---

## Done when

- Phase 1 checklist above passes on a preview build
- Phase 1b checklist passes on the deployed Supabase project
- `npm test` + `npm run typecheck` green (scrub tests included)
- Update [16_LOGGING_COMBINED.md](./16_LOGGING_COMBINED.md) (client + Edge errors also → Sentry) and [20_STATUS.md](./20_STATUS.md)
