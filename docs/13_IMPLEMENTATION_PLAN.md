# Implementation Plan — Vertical Slices
## Phase 0: runtime spike
Create Expo TypeScript + Expo Router app; Supabase client/session persistence (email/password) from current official quickstart; TanStack Query provider; local Supabase config; first migration; minimal Edge Function; verify **official OpenAI SDK** on Deno/Edge with a small structured call; verify audio package and short-audio runtime limits (~60s cap). Exit: auth, migration, function, and small OpenAI request work.

## Phase 1: Auth shell
Sign in/up, session restore, protected routes, sign out, home empty state. Exit: session persists and signed-out users can't enter private screens.

## Phase 2: Notes and storage
Migrations for profiles/notes/tasks/suggestions; RLS tests; private audio bucket/policies; create note, record/upload, status UI. Exit: own upload works, cross-user access denied.

## Phase 3: Transcription
Provider adapter, process function, status persistence, errors/retry. Begin with short audio and verify current Edge Function limits. Exit: recording -> transcript and recoverable failure.

## Phase 4: Task extraction
Schema/prompt, source quotes, review UI, edit/approve/reject, atomic/idempotent approval. Exit: one approved task per suggestion.

## Phase 5: Task management/search
Task list/edit/complete, basic search, source note link. Exit: persisted tasks usable after restart.

## Phase 6: Reminders
UTC reminder data, push-token registration, Cron + protected dispatcher, delivery ledger/retries, optional Resend. Exit: reminder is durable and push best-effort without duplicate DB delivery rows.

## Phase 7: Beta hardening
Deletion, privacy disclosure, rate limits, cost/latency metrics without content, RLS tests, physical-device tests, current provider terms/pricing review.

Build one vertical slice at a time. Don't scaffold every future feature. After each slice report files, migrations/functions, tests run, exact results, limitations, next slice.
