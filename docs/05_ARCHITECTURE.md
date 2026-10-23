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
- AI: transcription (`@google/genai` + `gemini-3.5-transcribe`) + structured extraction (LangChain `ChatGoogleGenerativeAI` + Gemini chat models) behind server adapters; Zod validation before persist (see `17_DECISIONS.md`).

## Flow
Expo app -> Auth session / TanStack Query / RLS-protected CRUD / private Storage upload.
For processing: app invokes `process-note` -> function validates JWT and ownership -> claims processing job -> reads private audio -> transcribes -> extracts schema-validated suggestions -> persists result/state -> app polls or subscribes to status.
Cron -> protected reminder dispatcher -> atomically claims due reminders -> checks task/preferences -> sends Expo push or optional email -> records delivery.
Cron -> `purge-note-audio` (`x-cron-secret`) -> storage API delete of `note-audio` objects whose note is at least 3 days old (any status) and of unreferenced objects older than 3 days -> clear `audio_path` and set `audio_purged_at`. The note row and transcript stay.

## Edge shared modules
Each Edge function is thin; shared behavior lives in `supabase/functions/_shared` (terms in [25_GLOSSARY.md](./25_GLOSSARY.md)):
- `http.ts` — `edgeRequest(scope)`: fail log + `{ ok:false, error, reason }` envelope + stable code. App side reads it with `edgeResult` (`src/lib/invoke-edge.ts`).
- `notes/note-lifecycle.ts` — note status machine: claim / complete / fail / stale reclaim as conditional updates. `note-audio`, `process-note`, and `extract-note` change note status only through it.
- `service-role.ts` — service-role client and cron-secret check (privileged deletes, cron functions).
- `ai/*` — provider adapters + pure AI helpers. `storage/*` — audio path and retention rules. `log.ts` — `edgeLog`.

## Client/server boundary
Client: UI, recording, Supabase publishable key, simple RLS-protected reads/writes.
Edge Functions: AI secrets, email/push sending, quotas, external APIs, privileged deletion, atomic/idempotent workflows.
DB: constraints, foreign keys, indexes, RLS, durable state.
Do not proxy every read through Edge Functions; do use functions for secrets and privileged work.

## Reliability
Never depend on the mobile app staying open for processing. V1: atomic Postgres job claim + inline Edge processing for **bounded short audio** (~60s cap to start; enforce in app and function). Hosted Edge has a 150s request idle timeout — do not assume long clips fit. Use bounded retries, idempotency, and safe failure states. Add a durable queue only after measured timeouts or retry load require it (see `17_DECISIONS.md`).
