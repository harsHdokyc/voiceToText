# Logging — Combined Reference
Last updated: 2026-10-02.

Single source for **how we log**, **what appears in the terminal**, and **error codes**.  
Agent rule: `.cursor/rules/08-logging.mdc`. Security: never log audio, transcripts, passwords, OTP, tokens, signed URLs, or API keys.

---

## Log format (app + Edge)

Every event is a **pretty-printed JSON block** (2-space indent, line break after each field), prefixed with `[vtw]`:

```text
[vtw]
{
  "ts": "ISO-8601",
  "src": "app|edge",
  "level": "info|error|warn|debug",
  "scope": "api.notes.upload",
  "event": "start|ok|fail|skip",
  "code": "optional_on_fail",
  "reason": "optional real cause",
  "durationMs": 420
}
```

| Field | Meaning |
|---|---|
| `ts` | ISO timestamp |
| `src` | `app` (Expo) or `edge` (Supabase Function) |
| `level` | severity |
| `scope` | stable operation name (`api.auth.sign_in`, `edge.process-note`) |
| `event` | `start` / `ok` / `fail` / `skip` |
| `code` | machine error code (on fail/skip) |
| `reason` | real human-readable cause (not “Something went wrong”) |
| `durationMs` | wall time for the operation |
| ids | `noteId`, `purpose`, `status`, `mimeType`, … — never secrets/content |

### Examples

```text
[vtw]
{
  "ts": "...",
  "src": "app",
  "level": "info",
  "scope": "api.notes.upload",
  "event": "ok",
  "noteId": "...",
  "durationMs": 420
}
```

Filter Metro: look for `[vtw]`.

Edge Function logs: Supabase Dashboard → Edge Functions → `process-note` → Logs (same `[vtw]` prefix).

---

## Code map

### App helpers
| Module | Role |
|---|---|
| `src/lib/logger.ts` | `formatLogLine` / `logger.*` |
| `src/lib/api-error.ts` | `ApiError`, `describeError`, `errorMessageForUi` |
| `src/lib/with-api-log.ts` | wraps API calls: start → ok/fail + duration |
| `supabase/functions/_shared/log.ts` | `edgeLog` |

### App scopes (instrumented)
| Scope | When |
|---|---|
| `api.auth.sign_in` / `sign_up` / `sign_out` | Auth |
| `api.auth.verify_otp` / `resend_signup_otp` / `request_password_reset` / `update_password` | Auth OTP/password |
| `api.notes.list` / `get` / `create_draft` | Notes CRUD |
| `api.notes.upload` | Storage upload |
| `api.notes.audio_upload_proxy` / `audio_download_proxy` | Client → Edge `note-audio` by noteId |
| `api.suggestions.list` / `approve` / `reject` | Task suggestions |
| `edge.note-audio` | Upload/download proxy (no storage key in responses) |
| `edge.process-note` | Claim → download → Whisper → extract → persist |
| `edge.approve-suggestion` | Approve suggestion + create task |
| `edge.reject-suggestion` | Reject suggestion |

---

## Error codes (stable)

Prefer these `code` values in DB `last_error_code`, JSON `error`, and logs `code`. `reason` carries the **real** provider/DB message when available.

| Code | Meaning |
|---|---|
| `unauthorized` | Missing/invalid user JWT |
| `note_id_required` | Body missing `noteId` |
| `note_load_failed` | DB read error loading note |
| `note_not_found` | Note missing or not owned |
| `not_claimable` | Status not queued / transcription_failed (skip) |
| `claim_lost` | Race: another claim won (skip) |
| `audio_missing` | `audio_path` null |
| `audio_fetch_failed` | Client could not read local recording URI |
| `audio_download_failed` | Edge could not download from `note-audio` |
| `storage_upload_failed` | Storage upload error (reason = provider message) |
| `transcript_persist_failed` | Could not write transcript/status |
| `transcription_failed` | Generic STT failure fallback |
| `extraction_failed` | Generic extraction failure fallback |
| `suggestions_insert_failed` | Could not write suggestions to DB |
| `final_status_update_failed` | Could not update note to review_ready |
| `process_note_empty` | Invoke returned empty body |
| `process_note_failed` | Invoke `ok: false` without code |
| `suggestion_id_required` | Body missing `suggestionId` |
| `suggestion_not_found` | Suggestion missing or not owned |
| `suggestion_not_found_or_not_pending` | RPC: suggestion not found or not pending |
| `not_pending` | Suggestion status is not pending |
| `already_extracting` | Note already in extracting state (skip) |
| `rpc_failed` | RPC function call failed |
| `approval_failed` | Generic approval failure fallback |
| `approve_suggestion_empty` | approve-suggestion returned empty body |
| `rejection_failed` | Generic rejection failure fallback |
| `reject_suggestion_empty` | reject-suggestion returned empty body |
| `suggestion_load_failed` | Could not load suggestion |
| `rejection_update_failed` | Could not update suggestion to rejected |
| `not_signed_in` | No session for a private op |
| `invalid_upload_status` | Upload attempted from illegal status |
| `status_transition_lost` | Conditional status update matched 0 rows |
| `not_retryable` | Retry while status not queued/failed |
| Supabase `code` (e.g. `23505`, `invalid_credentials`) | Passed through via `describeError` when present |

UI should show **`reason`** (via `authErrorMessage` / `errorMessageForUi`). Persist **`code`** on the note when relevant.

---

## Rules of thumb
1. Log every meaningful app↔backend operation with `withApiLog` or `edgeLog`.
2. On failure: always `code` + `reason` (real cause).
3. Never log content/secrets (see redaction lists in `logger.ts` / `_shared/log.ts`).
4. Do not invent generic-only errors when a provider message exists — wrap it: `storage_upload_failed` + provider reason.
5. New Edge Functions must use `_shared/log.ts` and return `{ ok, error, reason? }`.
