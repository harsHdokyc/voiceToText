# Notifications status (Expo Android / iOS / Web)

Research date: 2026-10-24  
Scope: current status of push reminders, device tokens, dispatch, email channel, cron.  
Primary sources only (repo docs + code + Expo docs where platform limits needed).

No existing `docs/research/` convention found; only adjacent research-style doc is `docs/03_COMPETITOR_RESEARCH.md`. This note lives at `docs/research/NOTIFICATIONS_STATUS.md` per request.

---

## Verdict by platform

| Platform | Verdict | Why |
|---|---|---|
| **Android** | **Ready to smoke** | Client + Edge + hosted cron `dispatch-reminders-every-minute` live. Physical / Expo Go push smoke still unchecked. |
| **iOS** | **Ready to smoke** | Same code path as Android. Same device-smoke gap. |
| **Web** | **Not built (push)** | `registerForPushNotifications` intentionally no-ops with `skipped: 'web'`. Reminder **rows** can still be scheduled in DB from web. Expo docs: Expo Notifications do not support web push. |

Sources: `docs/20_STATUS.md` (Phase 6), `src/features/reminders/services/push-registration.ts`, `docs/18_LEFTOVER.md` A2–A3 / B3, https://docs.expo.dev/guides/using-push-notifications-services/

---

## Architecture (codebase-design terms)

| Term | What |
|---|---|
| **Module** | Reminders slice: client schedule/cancel + push registration; Edge `register-push-token` / `dispatch-reminders`; Postgres `reminders` / `device_tokens` / `notification_deliveries` + `claim_due_reminders`. |
| **Interface** | App: `scheduleReminder` / `cancelReminder` / `registerForPushNotifications`. Edge: user JWT upsert token; cron header `x-cron-secret` → claim → Expo Push HTTP. |
| **Seam** | (1) Client ↔ Supabase tables/RPC for durable schedule. (2) Client ↔ `register-push-token` for tokens. (3) Cron ↔ `dispatch-reminders` ↔ Expo Push API. |
| **Adapter** | `expo-notifications` (device token); `fetch` to `https://exp.host/--/api/v2/push/send` (delivery); schema allows `email` channel but no Resend adapter wired. |
| **Depth** | Deep for scheduling (idempotency, cancel-other-scheduled, claim/retry ledger). Shallow for preferences (`push_enabled` column unused by dispatcher/UI toggle). |

Sources: `src/features/reminders/services/reminders-service.ts`, `push-registration.ts`, `supabase/functions/dispatch-reminders/index.ts`, `supabase/migrations/20261002184630_phase6_reminders.sql`, `docs/17_DECISIONS.md` (2026-10-03 Phase 6).

---

## What works today

### Product / docs intent
- PRD: user-created reminder; UTC storage; durable in-app; best-effort push. (`docs/01_PRD.md` § Reminders)
- Phase 6 exit marked **yes** for code: durable reminder + push best-effort; no duplicate delivery rows. Cron secret + schedule = ops. (`docs/20_STATUS.md`)
- Decision: persist UTC reminders, atomic claim, delivery ledger, Expo push; Resend deferred. (`docs/17_DECISIONS.md` 2026-10-03)

### Schema / RLS
- Tables: `device_tokens` (unique `expo_push_token`, platform enum `ios|android|web`), `reminders`, `notification_deliveries` (channels `push|email|in_app`). (`supabase/migrations/20261002184630_phase6_reminders.sql`; mirrored in `docs/07_DATA_MODEL.md`)
- `claim_due_reminders` — service_role only; claims due + stuck claimed rows. (same migration)
- `profiles.push_enabled` boolean default true. (`supabase/migrations/20261003165843_leftover_polish.sql`)

### Client (Expo)
- Dependency: `expo-notifications` `~57.0.21`. (`package.json`)
- EAS `projectId` present for token fetch. (`app.json` → `extra.eas.projectId`)
- `registerForPushNotifications`: skip web; skip simulator (`!Device.isDevice`); request permission; `getExpoPushTokenAsync`; invoke `register-push-token`. (`src/features/reminders/services/push-registration.ts`)
- Settings: “Enable push reminders” button → same registration. (`app/(app)/settings.tsx`)
- Schedule: `scheduleReminder` upserts by `idempotency_key`, cancels other `scheduled` for task; presets 1h/3h/1d via `scheduleReminderPreset` (best-effort register then schedule). (`reminders-service.ts`; used from `task-edit-save.ts`, `suggestion-edit-save.ts`)
- Cancel + list on task detail. (`app/(app)/tasks/[taskId].tsx`, `cancelReminder` / `listRemindersForTask`)

### Edge
- `register-push-token`: authenticated upsert into `device_tokens`. (`supabase/functions/register-push-token/index.ts`)
- `dispatch-reminders`: `x-cron-secret`; RPC claim; skip if task not open; Expo push batch; write `notification_deliveries`; retry up to `MAX_REMINDER_ATTEMPTS` (5) with +5 min reschedule. (`dispatch-reminders/index.ts`, `_shared/reminders/constants.ts`)
- Both listed ACTIVE on hosted; `dispatch-reminders-every-minute` scheduled 2026-10-24. (`docs/20_STATUS.md` Deployed backend / Ops)

### Design doc
- Push via `expo-notifications`; send from Edge; cron via `pg_cron`/`pg_net`+Vault; never hardcode secrets. (`docs/09_NOTIFICATIONS_EMAIL_CRON.md`)

---

## What is NOT done / leftover

From `docs/18_LEFTOVER.md` (and aligned STATUS):

| Item | Status note |
|---|---|
| **A2** Set Edge `CRON_SECRET` | Done (Vault `cron_secret`; matches Edge) |
| **A3** Schedule `dispatch-reminders` ~every 1 min | Done — `dispatch-reminders-every-minute` (`* * * * *`) |
| **B3** Device smoke: enable push; schedule; confirm `notification_deliveries` (+ push if allowed) | Unchecked |
| **B5** Denied notification shows clear errors | Unchecked (smoke) |
| **D** Resend transactional email channel | Optional; schema has `email`; needs `RESEND_API_KEY` + domain |
| **D** Reminder quiet hours / disable push UI | `push_enabled` exists; “UI + dispatcher check not wired” |

Also observed in code/docs (not always listed as leftover rows):
- Dispatcher always uses `channel: "push"`; no email send path in Edge. (`dispatch-reminders/index.ts`; only `RESEND_*` commented in `supabase/functions/.env.example`)
- `push_enabled` not read in `dispatch-reminders` (grep of functions: no usage beyond migration).
- `app.json` `plugins` does **not** include `expo-notifications` (only router/sqlite/audio/splash/speech-recognition). (`app.json`)
- Physical iOS/Android push smoke cannot be claimed done from repo. (`docs/20_STATUS.md` Physical device smoke)

---

## Email / cron status

### Email (product notifications)
- **Not built** for reminder delivery. Decision: Resend from Edge for transactional mail (P1+); Auth email separate; not required for early phases. (`docs/17_DECISIONS.md` 2026-10-02 Email; `docs/09_NOTIFICATIONS_EMAIL_CRON.md` § Email)
- Schema supports `delivery_channel = 'email'`; no Resend implementation in functions. (`phase6_reminders.sql`; `.env.example` comments only)
- Auth OTP email is a separate path (templates leftover A6), not reminder push.

### Cron
- Design: schedule `dispatch-reminders` every minute with `x-cron-secret`. (`docs/09_…`, `docs/17_DECISIONS.md`)
- **Hosted (2026-10-24):** Vault `cron_secret` + `project_url`; pg_cron **`dispatch-reminders-every-minute`** (`* * * * *`, active) and **`purge-note-audio-hourly`** (`0 * * * *`, active). Same header pattern; not stored in a migration.

---

## Platform limitation (Expo)

- Official: “Web notifications: Expo notifications do not support web notifications.”  
  https://docs.expo.dev/guides/using-push-notifications-services/
- `getExpoPushTokenAsync` / device push token APIs documented for **Android, iOS** only.  
  https://docs.expo.dev/versions/latest/sdk/notifications/
- Repo matches this by skipping registration on `Platform.OS === 'web'`. (`push-registration.ts`)

---

## Sources cited

### Docs
- `docs/01_PRD.md`
- `docs/02_V1_SCOPE.md`
- `docs/07_DATA_MODEL.md`
- `docs/09_NOTIFICATIONS_EMAIL_CRON.md`
- `docs/17_DECISIONS.md`
- `docs/18_LEFTOVER.md`
- `docs/20_STATUS.md`

### Code / schema
- `src/features/reminders/services/push-registration.ts`
- `src/features/reminders/services/reminders-service.ts`
- `src/features/tasks/services/task-edit-save.ts`
- `src/features/notes/services/suggestion-edit-save.ts`
- `app/(app)/settings.tsx`
- `app/(app)/tasks/[taskId].tsx`
- `app.json`
- `package.json`
- `supabase/migrations/20261002184630_phase6_reminders.sql`
- `supabase/migrations/20261003165843_leftover_polish.sql`
- `supabase/functions/register-push-token/index.ts`
- `supabase/functions/dispatch-reminders/index.ts`
- `supabase/functions/_shared/reminders/constants.ts`
- `supabase/functions/.env.example`

### Official
- https://docs.expo.dev/guides/using-push-notifications-services/
- https://docs.expo.dev/versions/latest/sdk/notifications/
