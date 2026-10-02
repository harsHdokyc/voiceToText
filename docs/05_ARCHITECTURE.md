# Architecture
## Stack
- App: Expo + React Native + TypeScript.
- Routing: Expo Router.
- Remote/server state: TanStack Query.
- Forms: React Hook Form only where useful; Zod for runtime schemas.
- Recording: current Expo audio package after verifying current SDK docs and background limitations.
- Backend: Supabase Auth, Postgres, private Storage, Edge Functions, RLS, Cron (`pg_cron`/`pg_net`), Vault, optional Queues, optional Realtime.
- Email: Resend from Edge Function for transactional messages; configure Auth email separately.
- Push: Expo Notifications + Expo Push Service.
- AI: transcription + structured extraction via official OpenAI SDK behind server adapters; Zod validation before persist (see `DECISIONS.md`).

## Flow
Expo app -> Auth session / TanStack Query / RLS-protected CRUD / private Storage upload.
For processing: app invokes `process-note` -> function validates JWT and ownership -> claims processing job -> reads private audio -> transcribes -> extracts schema-validated suggestions -> persists result/state -> app polls or subscribes to status.
Cron -> protected reminder dispatcher -> atomically claims due reminders -> checks task/preferences -> sends Expo push or optional email -> records delivery.

## Client/server boundary
Client: UI, recording, Supabase publishable key, simple RLS-protected reads/writes.
Edge Functions: AI secrets, email/push sending, quotas, external APIs, privileged deletion, atomic/idempotent workflows.
DB: constraints, foreign keys, indexes, RLS, durable state.
Do not proxy every read through Edge Functions; do use functions for secrets and privileged work.

## Reliability
Never depend on the mobile app staying open for processing. V1: atomic Postgres job claim + inline Edge processing for **bounded short audio** (~60s cap to start; enforce in app and function). Hosted Edge has a 150s request idle timeout — do not assume long clips fit. Use bounded retries, idempotency, and safe failure states. Add a durable queue only after measured timeouts or retry load require it (see `DECISIONS.md`).
