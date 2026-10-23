# Testing Strategy

## Default (locked)

**Unit tests side-by-side with pure logic** — and those unit tests must exercise **real business behavior**, not mock call-shapes.  
Policy: `.cursor/rules/07-testing.mdc`. Full style while editing tests: `.cursor/rules/fe-behavior-driven.mdc`.

**Unit ≠ hollow.** Isolation = run the real validator / status machine / parser with fixed inputs and assert the real output or thrown error. Do not `vi.mock` sibling pure code. Mock only true I/O boundaries, and still assert the unit’s resulting behavior.

What gets a unit test now:

- Validators, status transitions, path builders, MIME/extension helpers, env parsing, schema transforms, error-message mapping, route-param parsers, query retry rules, AI provider label/model helpers.

What does **not** get Vitest screen tests:

- Auth/note React screens and `auth-ui` — extract and test the business rules they use; don’t assert that a button called a mock.

What stays integration/manual/RLS:

- Supabase client calls, Storage ownership, Edge download, Expo audio permissions, full screen flows.

Exception: the note lifecycle (`_shared/notes/note-lifecycle.ts`) is unit-tested against a small in-memory `notes` table that implements only the query calls it makes (`update/eq/in/select/maybeSingle`). The table is the boundary; tests assert the resulting row status, never call shapes. Edge functions themselves are checked with `deno check` (Vitest cannot load `npm:` imports).

## Phase priority

Phases 0–3 onward: Vitest for pure helpers **as they land**; RLS/database tests and device smoke for storage/auth boundaries. Catch up any missed pure modules before starting the next product phase when practical.

## Unit

Place `foo.test.ts` under `test/` at the mirrored path (`src/lib/foo.ts` → `test/lib/foo.test.ts`, `supabase/functions/_shared/x.ts` → `test/supabase/functions/_shared/x.test.ts`; import via `@/` or `@supabaseShared/`). Cover happy path, invalid input, and boundaries with **concrete expected values** from the product rule (e.g. OTP length 8, max audio 60s, illegal status transitions). Prefer real behavior assertions over mock call-shape tests. A green suite that never runs the real rule is not a unit suite we keep.

## RLS/database

For every exposed table: anonymous access denied as intended; user A can access own rows; user A cannot read/update/delete user B rows; cannot change `user_id`; cannot attach task/reminder to another user's parent. Test Storage upload/download/delete path ownership. Use Supabase CLI local tests where supported. Happy-path reads do not prove RLS.

## Integration

Upload -> process -> transcript -> suggestions; retry transcription/extraction failures; no duplicate suggestions; approve twice -> one task; delete note -> audio eventually removed; due reminder -> durable delivery attempt.

## UI/manual

Auth restore/redirect, denied recording permission, upload failure/retry, processing failures, edit/reject/approve, task completion, empty states, network interruption, backgrounding, calls during recording, push permission denied/token refresh/logout, timezone/DST.

## Release checks

Typecheck, lint, unit tests, RLS tests, production build, secret scan, staging migration review, provider terms/privacy review, physical iOS/Android smoke tests.
