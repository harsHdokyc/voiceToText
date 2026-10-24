# Decision Log
Record material product/engineering choices here so Phase 0+ spikes do not get re-litigated. Newest first.

Format: date · decision · context · alternatives considered · consequence.

---

## 2026-10-24 · Dues carry an optional time; relative days follow the clock
- **Context:** Spoken times ("CEO meeting at 2 pm") reached `due_at`, but labels showed only the date and the edit sheet was date-only, so editing wiped the time. On web the date field never opened a picker: RN-web `TextInput` forces `type="text"`. A transcript that said "today is 23rd July" in October put every item months in the past.
- **Alternatives:** `due_has_time` column; `@react-native-community/datetimepicker` (native rebuild); trust spoken dates.
- **Decision:**
  - No time = local noon (existing convention). Any other local time is a **timed due**: labels add the time and it goes overdue once the time passes. `ponytail:` a real 12:00 deadline reads as date-only; add `due_has_time` if that starts to matter.
  - Edit sheet: separate date + time fields. Web uses native `<input type="date|time">` (click anywhere opens the picker); native stays typed `YYYY-MM-DD` / `HH:mm` until a picker dependency is justified.
  - Extraction prompt: today / tomorrow / weekday names always come from the **speaker's local time**; explicit dates in the transcript are still honoured; spoken clock times must be kept.
- **Consequence:** Suggestions extracted before 2026-10-24 keep their old (UTC-shifted or past) dues; re-record or edit them.
- **Open:** Both defaults were proposed to the product owner and not yet confirmed — reopen here if they change.

## 2026-10-24 · Note card grid = explicit flex rows
- **Context:** Notes grid computed pixel card widths from the *window* (ignores the 240px sidebar) and used `flex-wrap`; fractional / mis-measured widths dropped the 3rd card to the next row, leaving an empty column at desktop widths.
- **Decision:** `NoteCardGrid` picks 1–3 columns from its own measured width (min card 300px) and renders explicit rows of `flex-1` cards with spacers in a short last row. Cards under 360px use compact type. Pure helpers `noteGridLayout` / `noteGridRows` in `note-category.ts`.
- **Consequence:** A card can no longer wrap early; Overview and Voice notes share the fix.

## 2026-10-23 · "Today" is the user's local day, worldwide
- **Context:** Edge and Postgres run in UTC. The 40/day cap reset at UTC midnight (5:30 AM in India), and extraction had no current date, so "tomorrow at 5" could not resolve correctly anywhere.
- **Alternatives:** Hard-code `Asia/Kolkata`; send the zone with every request; IP geolocation.
- **Decision:** Store each user's IANA zone in `profiles.timezone` (already in schema). The app syncs it from the device on profile load, so travel updates it. A DB check ensures it's a real zone. `count_ai_usage_today` counts from local midnight; extraction gets the speaker's local time; naive `due_at` is read in that zone (`_shared/time/user-time.ts`). Unset → UTC. Storage stays UTC `timestamptz`; display stays device-local.
- **Consequence:** Users with no synced zone keep UTC behaviour until they open the app once. Applied on hosted 2026-10-24 (`user_timezone_day`, `extract-note` v13+).

## 2026-10-23 · Docker for web builds only
- **Context:** Need a one-command way to run the portal and landing page as production builds. The portal targets web, Android, and iOS.
- **Alternatives:** Containerize the Expo dev server (`expo start`) for devices; build Android in Docker; one image serving both sites.
- **Decision:** Two images, each a Node 24 build stage + nginx static stage: root `Dockerfile` (`expo export --platform web`) and `LandingPage/Dockerfile` (`vite build`). `docker-compose.yaml` maps portal → 3000, landing → 8080 (8081 stays free for Metro). Only `EXPO_PUBLIC_*` / `VITE_*` enter as build args; `.dockerignore` excludes `.env*`.
- **Consequence:** iOS/Android keep shipping through EAS. Vercel stays the landing host. Rebuild images after any env change (values are baked in).

## 2026-10-23 · Edge shared modules: request envelope, note lifecycle, service role
- **Context:** Architecture review of `supabase/functions`. Every function rebuilt its own fail log + JSON envelope; nine derived the error code with `reason.split(":")[0]`, a weaker copy of `describeProcessError`. Note status writes were spread over `note-audio`, `process-note`, `extract-note`, and `provider-utils`, with an unused `failTargetForStage`. Service-role client and cron-secret check were pasted into four / two functions with two `supabase-js` versions (two functions failed `deno check`).
- **Alternatives:** Leave per-function code; a full `withUser` handler wrapper around every function; move note transitions into Postgres RPCs.
- **Decision:**
  - `_shared/http.ts` `edgeRequest(scope)` owns fail logging, `durationMs`, code derivation (`describeProcessError`), and the `{ ok:false, error, reason }` envelope. Every function uses it. Failure bodies now always carry `reason`.
  - `describeProcessError`: a snake_case `machine_code:` prefix wins before the `503` text match (a UUID containing `503` no longer becomes `upstream_unavailable`).
  - `_shared/notes/note-lifecycle.ts` owns claim / complete / fail / stale reclaim as conditional updates on the expected status (user-scoped client, RLS still applies). Glossary: [25_GLOSSARY.md](./25_GLOSSARY.md).
  - `_shared/service-role.ts` owns `serviceClient()` (pinned `supabase-js@2.49.1`) and `hasCronSecret(req)`.
- **Consequence:** No migration. Redeploy every Edge function except `health`. New Edge code must use these modules instead of inlining. Tests: `test/supabase/functions/_shared/{http,notes/note-lifecycle}.test.ts`.

## 2026-10-23 · Reject stays in Edge; review bugs fixed in place
- **Context:** Approve uses the `approve_suggestion` RPC; reject does read-then-update in Edge. Reject returned `ok:true` when a concurrent approve won and the update matched no row. Approve turned an invalid `edits.due_at` into a 502.
- **Alternatives:** New `reject_suggestion` RPC + migration.
- **Decision:** Keep reject in Edge. Its update now selects the row and returns `not_pending` when nothing changed. Approve validates `due_at` first and returns 400 `invalid_due_at`.
- **Consequence:** Do not re-suggest a reject RPC unless reject gains multi-row work (it is a single conditional update, already atomic).

## 2026-10-23 · Debug spike off by default
- **Context:** Any signed-in user could call `openai-spike` chat/transcribe. It skips the 40/day cap and `ai_usage_events`.
- **Alternatives:** Delete the function; admin allow-list; count it against the cap.
- **Decision:** `openai-spike` returns 404 `not_found` unless the Edge secret `ENABLE_DEBUG_FUNCTIONS=true`. `health` stays open (no AI call).
- **Consequence:** Settings → Developer “openai-spike” probes 404 on hosted unless the flag is set. Set it locally or briefly for A4 in LEFTOVER, then unset.

## 2026-10-22 · Usage count runs as the caller
- **Context:** `20261022180000_count_ai_usage_ownership` was applied. Asking for another user’s count returned that count (0 when they had no rows today) and did not raise. Inside a `security definer` function the session role is the owner, `postgres`, which was on the exemption list, so the check never ran.
- **Alternatives:** Delete the owner from the exemption and stay `security definer`. A later edit that trusts the session role breaks the same way, and a failed check still bypasses `ai_usage_events` RLS. Revoke `authenticated` and use only `service_role`. `process-note` calls the RPC with the user JWT; a failed count is logged and ignored, so the 40/day cap would stop.
- **Decision:** New function is `security invoker`. Authenticated callers may pass only `auth.uid()`; a mismatch raises `42501`. The JWT role allows `service_role` to count any user, and that role bypasses RLS. The UTC day filter is unchanged. Do not edit `20261022180000`.
- **Consequence:** Apply `20261022200000_count_ai_usage_invoker`. No Edge function redeploy.

## 2026-10-22 · Daily AI usage count is the caller’s own
- **Context:** `public.count_ai_usage_today(p_user_id, p_kind)` is `security definer` and was granted to `authenticated` with no check that `p_user_id` is the caller. Any signed-in user could read another user’s daily count through the API.
- **Alternatives:** Revoke `authenticated` and grant only `service_role`. That breaks the cap: `process-note` calls the RPC with the user JWT and `p_user_id` = that user’s id, and a failed count is logged then ignored.
- **Decision:** Keep the `authenticated` grant. Non-service callers may count only `auth.uid()`; a mismatch raises `42501 forbidden`. `service_role` (and the DB owner roles) may still count any user. The UTC day filter is unchanged, so the 40/day cap still sees the same rows. `approve_suggestion`, `create_manual_task`, and `delete_own_app_data` already require `auth.uid()` and pin `search_path = public`; they are not replaced.
- **Consequence:** Superseded the same day by “Usage count runs as the caller”. `20261022180000` is applied and does not raise. Do not edit `20261002184635_phase7_hardening`.

## 2026-10-22 · 3-day audio window is the retry window
- **Context:** The first retention rule kept audio for in-progress notes, `transcription_failed`, and notes with no transcript. The owner set the opposite rule: 3 days is the only chance to retry from the recording.
- **Alternatives:** Keep the status allowlist; purge `transcription_failed` only when a transcript exists; edit `20261022140000_audio_retention` in place.
- **Decision:**
  - Purge every `note-audio` object whose note `created_at` is at least 3 days ago, any status (including stuck `extracting` / `transcribing`, `draft`, `transcription_failed`, and a historical `archived` value), whether or not a transcript exists.
  - `20261022140000_audio_retention` stays as applied. `notes_audio_retention_idx` already matches the wider predicate, so it is not replaced.
  - New migration `20261022160000_audio_purge_any_status` adds service-role `list_orphan_note_audio`. The edge function deletes those objects with the Storage API. An object stays when a note still references it, or when `created_at` or `updated_at` is under 3 days (a same-key replace is not deleted).
  - After purge, retry calls `extract-note` when a transcript exists (including `transcription_failed` and `queued` once the file is gone). With neither file nor transcript, the app hides retry and explains why.
- **Consequence:** Redeploy `purge-note-audio` and `extract-note` after applying `20261022160000`. Do not edit `20261022140000`. Supersedes the eligibility bullet in “Voice-note audio deleted 3 days after recording” below.

## 2026-10-22 · Voice-note audio deleted 3 days after recording
- **Context:** Private `note-audio` objects should not be kept indefinitely. Notes, transcripts, suggestions, tasks, and reminders stay. Hosted project does not have `pg_cron` installed. Deleting `storage.objects` rows does not remove the file.
- **Alternatives:** Hard-delete the whole note; purge every status at 3 days including `transcription_failed`; schedule inside the migration with a secret; enable `pg_cron` in the same migration as the column.
- **Decision:**
  - Column `notes.audio_purged_at`. Clients can read it. Only `service_role` (or the DB owner) can set it.
  - Edge `purge-note-audio` uses the service role and `x-cron-secret` (same `CRON_SECRET` as `dispatch-reminders`). `verify_jwt = false`.
  - Eligible when `created_at` is at least 3 days ago, `audio_path` is set, and `audio_purged_at` is null. Status and transcript do not keep the file (superseded the same day by “3-day audio window is the retry window”).
  - `created_at` is the recording clock. Retry from a stored transcript uses `extract-note` and does not need the file.
  - Storage API `remove` per object. Clear `audio_path` and set `audio_purged_at` only after that call is confirmed. Reruns are safe. Batch 40.
  - No cron SQL in the migration. Schedule hourly in the dashboard, or with `pg_cron` + `pg_net` reading the secret from Vault. Do not hardcode the secret.
- **Consequence:** Apply migration `20261022140000_audio_retention` before deploying `note-audio`, `process-note`, or an app build that selects `audio_purged_at`. Audio is not deleted until the function is deployed and scheduled. Playback of a purged note shows “Audio deleted after 3 days”.

## 2026-10-19 · AI provider = Google Gemini via LangChain + @google/genai
- **Context:** Switch Edge AI off OpenAI/Naga OpenAI-compatible stack to Gemini; use LangChain for chat/extraction communication.
- **Alternatives:** Keep OpenAI SDK; Gemini OpenAI-compat endpoint only; LangChain for both STT and chat; Vertex AI.
- **Decision:**
  - **Chat / task extraction:** LangChain `ChatGoogleGenerativeAI` from `@langchain/google-genai` (+ `@langchain/core`), JSON + Zod (not `withStructuredOutput`). Default `AI_CHAT_MODEL=gemini-3.8-flash`, fallback `gemini-3.6-flash` (do not use retired `gemini-2.5-flash`).
  - **Transcription:** Official `@google/genai` **Interactions API** with `AI_TRANSCRIPTION_MODEL=gemini-3.5-transcribe` (dedicated STT model; not a LangChain chat wrapper).
  - **Secret:** `GOOGLE_API_KEY` (alias `GEMINI_API_KEY`) — Edge only, never Expo / `EXPO_PUBLIC_*`.
  - Keep provider adapters (`transcription-provider`, `task-extraction-provider`); call sites (`process-note`, spike) unchanged.
- **Consequence:** Hosted Edge secrets must **replace** any `OPENAI_*` values with `GOOGLE_API_KEY` (+ optional model overrides). Spike slug `openai-spike` remains historical. Supersedes “AI provider = official OpenAI” defaults for new deploys.
- **Why STT is not LangChain:** `gemini-3.5-transcribe` is Interactions-API STT; LangChain’s Google chat integration covers chat models, not this unary transcribe path.

## 2026-10-24 · Product Expo web on Vercel (`getsaydo`) + landing Sign in URL
- **Context:** Landing Sign in fell back to `/early-access` without `VITE_APP_URL`. Product needed a public web host separate from the Vite marketing site.
- **Alternatives:** Single Vercel project with path prefixes; Expo web under `LandingPage`; EAS Hosting only; custom domain immediately.
- **Decision:**
  - Second Vercel project **`getsaydo`** on the same repo, Root Directory = **repo root**, build `npx expo export --platform web`, output `dist`.
  - Production URL https://getsaydo.vercel.app/ (legacy alias `saydo-app.vercel.app`). `saydo.vercel.app` was unavailable.
  - Root `vercel.json` SPA rewrite **must exclude** `/_expo/` (and `/assets/`) so JS bundles are not rewritten to HTML.
  - Landing project keeps Root Directory `LandingPage`; set `VITE_APP_URL=https://getsaydo.vercel.app` and redeploy so Sign in leaves the marketing site.
  - Turn off Vercel Deployment Protection on product production so Auth is public.
- **Consequence:** Two Vercel projects, one repo. Documented in [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md) / [20_STATUS.md](./20_STATUS.md). Add product origin to Supabase Auth redirect URLs. Custom `app.saydo.com` later.

## 2026-10-19 · Marketing host = Vercel, Root Directory `LandingPage`
- **Context:** Landing Vite app lives in a monorepo next to Expo. Building from repo root pulls Expo `tsconfig` / wrong install graph; Vercel needs an explicit app root.
- **Alternatives:** Netlify; Expo web for marketing; subdirectory rewrite without Root Directory.
- **Decision:**
  - Host static marketing on **Vercel** with **Root Directory = `LandingPage`**, production branch `main`.
  - Inject `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (and optional `VITE_APP_URL`) as Vercel env at build time.
  - Keep `tsc -b` scoped to `LandingPage/src` only — do not include `vite.config.ts` in that project unless `@types/node` is added.
- **Consequence:** Deploy progress and ops checklist live in [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md) and [20_STATUS.md](./20_STATUS.md). Never put `service_role` in Vercel. Superseded in part by 2026-10-24 for product web hosting / required `VITE_APP_URL`.

## 2026-10-18 · Marketing landing = Vite app + shared Supabase waitlist
- **Context:** Marketing site was deferred from Expo; `LandingPage/` needed a real waitlist without a second backend. Reference UI already inserts into `waitlist` (table was missing on hosted).
- **Alternatives:** Separate waitlist DB/SaaS; create Auth users from the form; host marketing inside Expo.
- **Decision:**
  - One hosted project (`voiceToWork`). Add `public.waitlist` (email unique case-insensitive, optional `first_name`, RLS insert-only for anon/authenticated).
  - Ship marketing as Vite + React in `LandingPage/` pointing at the same publishable key.
  - Waitlist ≠ account; product sign-up stays in the Expo app (web + future store builds).
- **Consequence:** Details in [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md). Do not invent a second database for early access.

## 2026-10-18 · Product UI = Saydo workspace from `ui/goals-in-motion-55`
- **Context:** Visual/interaction reference landed in `ui/goals-in-motion-55` (TanStack + Tailwind demo). Expo app needed the same **Workspace / dashboard (+ auth)** chrome without becoming a second demo runtime.
- **Alternatives:** Paste prototype wholesale; keep green “Voice-to-Work” chrome; port marketing site now.
- **Decision:**
  - **Brand:** user-facing product name is **Saydo** (`APP_NAME`, Expo `name`). Package slug `voice-to-work` may remain internal.
  - **Scope now:** Workspace shell + Overview / notes / suggestions / tasks / settings + auth restyle. **Marketing site deferred** (`ui/` stays reference only).
  - **Display name:** real `profiles.display_name` (Settings save + Overview greeting; signup metadata seeds via trigger).
  - **Note category:** `Work | Ideas | Personal` (+ All notes chip); default **Ideas** on create.
  - **Capture:** `expo-audio` → private upload → `process-note` (Web Speech only as optional live **preview** on web). No Lovable / demo seeds / “Continue to demo”.
  - **Reminders:** durable schedule APIs (1h / 3h / 1d), not in-tab toast polling.
- **Consequence:** UI work tracks `docs/22_ui-execution-planner.md`. Do not import `ui/` into the Expo runtime or ship demo footers (“changes are not saved”).

## 2026-10-02 · AI provider = official OpenAI (leave Naga :free)
- **Context:** Naga `:free` hit shared daily rate limits (429) and flaky 503s during Phase 4 extraction; unsuitable for smooth testing with real private audio.
- **Alternatives:** Stay on Naga paid; other OpenAI-compatible gateways; self-hosted Whisper.
- **Decision:** Default Edge AI to **official OpenAI** via the existing OpenAI SDK adapters:
  - `OPENAI_BASE_URL=https://api.openai.com/v1`
  - `OPENAI_API_KEY=<OpenAI secret key>` (Edge secrets only — never Expo / `EXPO_PUBLIC_*`)
  - `AI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe` (~$0.003/min)
  - `AI_CHAT_MODEL=gpt-4o-mini` (structured extraction)
- **Consequence:** Hosted Edge secrets must be **replaced** (old Naga URL/key/models override code defaults if left set). Adapters unchanged — swap is config-only. Naga remains a historical prototype option if `OPENAI_BASE_URL` points at it again.
- **Supersedes:** earlier “Prototype AI provider = Naga” default for new deploys (entry kept below for history).
- **Status:** Superseded for defaults by “AI provider = Google Gemini via LangChain + @google/genai” (2026-10-19).

## 2026-10-02 · Prototype AI provider = Naga (OpenAI-compatible), not direct OpenAI yet
- **Context:** Need a low-cost STT + chat path for early spikes. Naga exposes OpenAI SDK-compatible APIs at `https://api.naga.ac/v1` ([overview](https://docs.naga.ac/api-reference/overview), [Whisper free](https://naga.ac/models/whisper-large-v3%3Afree)).
- **Alternatives:** Official OpenAI only; self-hosted Whisper; other gateways.
- **Decision:** Use **official OpenAI SDK** in Edge Functions with:
  - `OPENAI_BASE_URL=https://api.naga.ac/v1`
  - `OPENAI_API_KEY=<Naga API key>`
  - `AI_TRANSCRIPTION_MODEL=whisper-large-v3:free`
  - `AI_CHAT_MODEL=llama-3.3-70b-instruct:free` (structured extraction spike)
  Keep provider adapters (`transcription-provider`, `task-extraction-provider`) so swapping to official OpenAI or paid Naga models is config-only.
- **Caveats (accepted for prototype only):**
  - `:free` model traffic may be used for training ([Naga privacy](https://docs.naga.ac/account/privacy-and-logging.md)) — **not** suitable as the long-term private-voice production default.
  - Free rate limits: **10 req/min**, **100 req/day** shared across all `:free` models ([limits](https://docs.naga.ac/build/rate-limits.md)).
  - Free chat upstreams can return **503** (“upstream provider temporarily unavailable”). Extraction tries a short fallback list of free chat models; if all fail, retry later or set `AI_CHAT_MODEL` to a healthier free/paid id.
- **Consequence:** Before broader private beta with real user audio, move to paid Naga (training off) or official OpenAI. Never put the key in Expo/`EXPO_PUBLIC_*`.
- **Default chat model:** `llama-4-scout-17b-16e-instruct:free` (switched from `llama-3.3-70b-instruct:free` after observed 503s on that id).
- **Status:** Superseded for defaults by “AI provider = official OpenAI” (same day).

## 2026-10-02 · Email confirmation + recovery use 8-digit OTP (no magic links in-app)
- **Context:** User configured Supabase email templates for OTP instead of confirmation links.
- **Decision:** Keep email+password as credentials. Confirm signup and password recovery with `verifyOtp` (`signup` / `recovery`) and an in-app OTP screen. OTP length = 8.
- **Consequence:** App routes: sign-in, sign-up, verify-otp, forgot-password, reset-password. Do not build deep-link magic-link handling for V1 auth.

## 2026-10-02 · Hosted Phase 0 target = project ubqhyeicmgmdzethtids
- **Context:** User connected Supabase MCP and asked to deploy to https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids
- **Decision:** Use hosted project `voiceToWork` (`ap-south-1`) as the Phase 0 backend; apply `phase0_profiles` and deploy `health` + `openai-spike` via MCP.
- **Consequence:** App `.env` points at `https://ubqhyeicmgmdzethtids.supabase.co`. Local Docker stack remains optional for offline work.

## 2026-10-02 · Phase 0 scaffold complete (runtime verify pending Docker)
- **Context:** Phase 0 required Expo + Supabase client/session, Query, local config, first migration, Edge health + OpenAI spike, audio package/cap.
- **Decision:** Ship the scaffold in-repo; treat `supabase start` + signed-in function invokes as the remaining machine-local exit checks.
- **Consequence:** See 20_STATUS.md “Manual next”. Do not begin Phase 2 notes schema until health invoke works against local Supabase.

## 2026-10-02 · Auth for private beta = email + password
- **Context:** PRD allows email/password or passwordless. Magic links/OTP need mobile deep-link setup; Expo’s Supabase guide notes email/password needs no extra redirect config for basic sign-in.
- **Alternatives:** Magic link only; email OTP codes; OAuth (Google/Apple) first.
- **Decision:** **Email + password** for Phase 0–1 and private beta. Session persistence via the current Expo + Supabase client pattern. Defer magic link / OAuth until deep linking is intentional work (not a Phase 1 blocker). For local iteration, email confirmation may be disabled; before broader beta, enable confirmation and document the flow.
- **Consequence:** Phase 1 ships sign-up / sign-in / sign-out / protected routes without redirect URI complexity. Add passwordless later as an additive path, not a rewrite.

## 2026-10-02 · Processing durability = Postgres claim + inline Edge for short audio
- **Context:** Hosted Edge Functions must respond within a **150s request idle timeout**; wall clock is 150s free / 400s paid. Mobile must not stay open for processing. Full queue products add ops cost before product proof.
- **Alternatives:** Always use Supabase Queues / external worker from day one; fire-and-forget with no claim; depend on the app to finish upload+AI.
- **Decision:** **V1 durability is the note status machine + atomic job claim in Postgres**, not a separate queue. `process-note` claims the row, runs **transcribe → extract inline** for **bounded short audio** (enforce max duration/size in product + function; start at ~60s audio cap and tighten if needed). On failure: safe `*_failed` state + retryable flag, original audio kept. **Introduce a durable queue/worker only if** measured runs hit idle/wall-clock limits at the chosen cap, or background retries become common.
- **Consequence:** No queue scaffolding in Phase 0–4. Reliability comes from idempotent claim, status transitions, and audio caps. App polls (or optional Realtime later) for status — never assumes the client finishes AI work.

## 2026-10-02 · Structured extraction = OpenAI SDK behind adapter + Zod (not Vercel AI SDK for V1)
- **Context:** Extraction needs schema-validated JSON. Vercel AI SDK is elegant but Deno/Supabase Edge compatibility is a moving target; Supabase documents the official OpenAI client path on Edge. Transcription is already OpenAI STT via a server adapter.
- **Alternatives:** Block on `ai` + `@ai-sdk/openai` spike; dual-support both SDKs from day one.
- **Decision:** **V1 uses the official OpenAI SDK** (Deno/JSR or npm import verified in Phase 0) inside `TaskExtractionProvider`, with **Zod (and app checks) validating all model output before persist**. Same vendor stack as transcription. **Do not adopt Vercel AI SDK for V1** unless a later multi-provider need appears; the provider interface stays SDK-swappable.
- **Consequence:** Phase 0 spike = “small OpenAI chat/structured call works on Edge,” not “fight AI SDK bundling.” Pin SDK versions. Never log transcripts/prompts.
- **Status:** Superseded for SDK choice by LangChain Gemini + Zod (2026-10-19); still no Vercel AI SDK for V1.

## 2026-10-02 · Transactional email = Resend from Edge; Auth email separate
- **Context:** Reminders/notifications need email later; Supabase Auth has its own mail path.
- **Alternatives:** Supabase Auth mail for all product email; SendGrid/Postmark first.
- **Decision:** **Resend** from Edge Functions for product transactional mail (P1+). **Configure Supabase Auth email separately** (confirm/reset). No transcript content in email bodies. Not required for Phase 0 exit.
- **Consequence:** Don’t build a generic email platform. Add SPF/DKIM/DMARC when a custom domain is used.

## 2026-10-02 · Docs live at `docs/` (lowercase); Cursor rules at repo root
- **Context:** Pack initially used `Docs/` and nested `Docs/.cursor/rules/`, which Cursor does not load by default.
- **Alternatives:** Keep nested docs-only rules; symlink both places.
- **Decision:** Single source for agent rules at `.cursor/rules/`. Product blueprint at `docs/`.
- **Consequence:** Do not recreate `docs/.cursor/`. Update STATUS when phases change.

## 2026-10-02 · Note audio access is noteId proxy (never expose storage keys to client)
- **Context:** Dashboard object keys (`userId/…/original.m4a`) are fine server-side; returning them in app API/network makes keys easy to scrape and couples the UI to Storage layout. Email-as-folder was rejected (PII, churn, RLS mismatch).
- **Alternatives:** Signed URLs from client; email folder prefixes; direct Storage upload from app.
- **Decision:**
  - Object key stays `{user_id}/notes/{note_id}/original.ext` (first segment = `auth.uid()` for Storage RLS).
  - Client talks only in **`noteId`**. Edge Function `note-audio` uploads (multipart) and downloads (raw bytes) after JWT + ownership checks. `audio_path` is selected only on the server; client note queries omit it.
  - All proxy ops emit structured `[vtw]` logs (`code` + `reason`, noteId, bytes — never the key in client responses).
- **Consequence:** App uses `note-audio-proxy.ts`; `process-note` still reads `audio_path` from DB. Existing objects at the old `{user_id}/{note_id}/…` path keep working until re-uploaded.

## 2026-10-02 · Structured `[vtw]` logging with code + real reason
- **Context:** Metro showed almost no API/backend signal; failures were generic. Need greppable logs without logging secrets/content.
- **Alternatives:** Rely on Supabase dashboard only; ad-hoc `console.log`; full APM.
- **Decision:** One-line JSON logs prefixed `[vtw]` from app (`withApiLog` / `logger`) and Edge (`edgeLog`). Every failure includes stable `code` + human `reason` (provider/DB text when available). Catalog in `docs/16_LOGGING_COMBINED.md`. Rule: `.cursor/rules/08-logging.mdc`.
- **Consequence:** New API paths and Edge Functions must log start/ok/fail; UI shows reason; `last_error_code` stores code.

## 2026-10-02 · Unit tests must prove business behavior (not mock theater)
- **Context:** “Unit test” can be misread as “mock everything.” User wants real unit tests that still encode product rules (validation, status machine, paths, retry policy).
- **Alternatives:** Screen-level RNTL with mocked services; call-shape-only suites; defer quality until E2E.
- **Decision:** Keep Vitest unit tests. Isolation = run pure logic for real. Assert outputs/errors that would change if the business rule broke. Mock only true I/O boundaries; never mock the SUT or sibling pure helpers. Screens stay untested in Vitest; their rules are extracted and unit-tested. Locked in `.cursor/rules/07-testing.mdc` + `fe-behavior-driven.mdc`.
- **Consequence:** PRs that add `toHaveBeenCalled`-only tests or mock-configured echo tests are incomplete — rewrite to behavior assertions.

## 2026-10-03 · Phase 6 reminders = durable schedule + best-effort Expo push
- **Context:** Need follow-through without duplicate delivery rows; push is unreliable.
- **Decision:** Persist UTC `reminders` with unique `idempotency_key`; atomic `claim_due_reminders` (service_role); Edge `dispatch-reminders` auth via `x-cron-secret`; ledger `notification_deliveries` unique on `(reminder_id, channel, attempt_number)`; tokens in `device_tokens`.
- **Ops:** Set Edge secret `CRON_SECRET`; schedule invoke every minute via Dashboard Cron / pg_cron+pg_net+Vault (never hardcode secrets in SQL). Optional Resend channel deferred.
- **Consequence:** In-app reminder rows remain source of truth even if push fails.

## 2026-10-03 · Phase 7 hardening baseline
- **Context:** Private beta needs deletion, privacy copy, quotas, content-free metrics, RLS proof.
- **Decision:** Edge `delete-note` / `delete-account`; Settings privacy disclosure; `ai_usage_events` + daily `process-note` cap (40); Vitest policy inventory + `supabase/tests/rls_phase6_phase7.sql` checklist; physical device smoke documented in STATUS (not automated here).
- **Provider terms:** Official OpenAI + Supabase terms must be re-checked before broader launch (links in 14_SETUP / OpenAI pricing docs).
- **Consequence:** Phase 7 exit met for code/docs; live cron secret + device smoke remain operator steps.

## 2026-10-02 · Vitest is mandatory side-by-side for pure logic (never “later”)
- **Context:** Waiting until a dedicated test phase left pure helpers untested and made regressions cheap to ship. User asked to always write tests with new work.
- **Alternatives:** Defer until Phase 7; only test at release; always-apply the full behavior-driven essay on every chat.
- **Decision:**
  - **Always** add/update `*.test.ts` in the same change as non-trivial pure logic.
  - Agent rule: `.cursor/rules/07-testing.mdc` (`alwaysApply: true`).
  - Assertion style: `.cursor/rules/fe-behavior-driven.mdc` (glob on test files only).
  - Skip Vitest for thin I/O wrappers; extract a pure helper if the rule needs a test.
  - RLS/integration/device checks still required for auth/storage — Vitest does not replace them.
- **Consequence:** Phase 4+ PRs without tests for new pure helpers are incomplete. Catch up existing pure modules before the next product phase when practical.

## 2026-10-02 · Phase 3 transcription = inline Edge claim (no queue yet)
- **Context:** Short audio (≤60s) fits Edge request lifetime; need idempotent claim so double-taps don't double-bill STT.
- **Alternatives:** Always enqueue via DB queue/cron; client-only polling without claim.
- **Decision:** `process-note` conditional-updates `queued`/`transcription_failed` → `transcribing`, downloads private `note-audio`, calls Whisper adapter, writes `review_ready` (or `transcription_failed`). Skip-extract path until Phase 4.
- **Consequence:** Extraction is a separate Phase 4 invoke; retry from note detail re-invokes the same function.
