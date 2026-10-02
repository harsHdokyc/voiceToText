# Testing Strategy
## Phase priority
Phases 0–2: prioritize RLS/database tests, integration of upload/process paths, and manual device checks over a large Vitest suite. Behavior-driven Vitest rules in `.cursor/rules/fe-behavior-driven.mdc` apply when writing or editing `*.test` / `*.spec` files — not as always-on guidance during scaffolding.

## Unit
Schema validation, note status transitions, timezone/date parsing, provider error mapping, idempotency, invalid inputs. Prefer real behavior assertions over mock call-shape tests.

## RLS/database
For every exposed table: anonymous access denied as intended; user A can access own rows; user A cannot read/update/delete user B rows; cannot change `user_id`; cannot attach task/reminder to another user's parent. Test Storage upload/download/delete path ownership. Use Supabase CLI local tests where supported. Happy-path reads do not prove RLS.

## Integration
Upload -> process -> transcript -> suggestions; retry transcription/extraction failures; no duplicate suggestions; approve twice -> one task; delete note -> audio eventually removed; due reminder -> durable delivery attempt.

## UI/manual
Auth restore/redirect, denied recording permission, upload failure/retry, processing failures, edit/reject/approve, task completion, empty states, network interruption, backgrounding, calls during recording, push permission denied/token refresh/logout, timezone/DST.

## Release checks
Typecheck, lint, unit tests, RLS tests, production build, secret scan, staging migration review, provider terms/privacy review, physical iOS/Android smoke tests.
