# Decision Log
Record material product/engineering choices here so Phase 0+ spikes do not get re-litigated. Newest first.

Format: date · decision · context · alternatives considered · consequence.

---

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
- **Consequence:** See STATUS.md “Manual next”. Do not begin Phase 2 notes schema until health invoke works against local Supabase.

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

## 2026-10-02 · Vitest behavior rule is deferred until test files exist
- **Context:** Behavior-driven Vitest guidance is valuable but heavy for a docs-only / Phase 0–2 repo.
- **Alternatives:** Always-apply the rule; delete it until later.
- **Decision:** Keep `.cursor/rules/fe-behavior-driven.mdc` with `alwaysApply: false` and globs on `*.{test,spec}.{ts,tsx}`. Phases 0–2 prioritize RLS + integration acceptance over a large unit suite.
- **Consequence:** Write Vitest suites when pure logic exists; follow the rule only while editing tests.
