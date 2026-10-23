# Process-note wall-clock fix + stuck AI cleanup

**Status:** implement next · **Plan:** Free (no Supabase Pro) · **Incident:** HTTP 546 `WORKER_RESOURCE_LIMIT`  
**Root cause:** Free Edge wall-clock **~150s**. Transcription finishes (~5s); Gemini **extract** hangs → isolate killed as `WallClockTime` (not memory/CPU). Notes left as `extracting` with transcript already saved.

Related: [06_AI_PIPELINE.md](./06_AI_PIPELINE.md), [17_DECISIONS.md](./17_DECISIONS.md), `process-note`, `delete-note`.

---

## Goal

Survive slow/hung Gemini **without Pro**, leave notes recoverable, and clear junk / stuck AI state.

---

## Do this (ordered)

### 1. Hard timeout on extract (highest impact, smallest diff)

- Abort Gemini chat after **~25–30s** (total extract budget including one fallback).
- On timeout → persist `extraction_failed` + `last_error_code` (e.g. `upstream_timeout`) — **never** leave silent `extracting`.
- Keep transcript. Do not delete the note.

### 2. Split one Edge call into two budgets

| Step | Claim / status | Returns when |
|------|----------------|--------------|
| A Transcribe | `queued` → `transcribing` → `extracting` | After `transcribe_ok` |
| B Extract | `extracting` / `extraction_failed` → `review_ready` | After suggestions |

- Client: after A succeeds, immediately invoke B (same `noteId`). Each request gets its own **150s**.
- Reuse existing `EXTRACT_CLAIMABLE` (`extracting`, `extraction_failed`).

### 3. Rollback stuck AI (not delete)

When wall-clock kills mid-extract, transcript is already good — **rollback status**, don’t wipe content.

| Condition | Action |
|-----------|--------|
| `extracting` and `updated_at` older than **3 min** | Set `extraction_failed`, `last_error_code = stuck_extracting` |
| User taps Retry | Claim extract-only → run B |
| Optional cron / on next `process-note` | Same stale flip before claim |

Never roll back `review_ready` or wipe `transcript` for stuck extract.

### 4. Delete junk / old abandoned notes

Use existing **`delete-note`** (audio + row + related). Add UI + optional one-off SQL for owners only.

| Junk | Delete when |
|------|-------------|
| Forever `extracting` / `extraction_failed`, user gave up | User deletes note |
| `queued` / `transcription_failed`, no useful audio, age **> 7 days** | User delete or optional cleanup job |
| Abandoned drafts with no transcript and no retry | Same |

**Do not auto-delete** notes that have a transcript unless the user confirms — they can still retry extract.

One-off hosted cleanup (owner-scoped; run in SQL editor after reviewing counts):

```sql
-- Inspect first
select status, count(*) from notes group by 1;

-- Example: mark stale extracting (rollback, not delete)
update notes
set status = 'extraction_failed',
    last_error_code = 'stuck_extracting',
    updated_at = now()
where status = 'extracting'
  and updated_at < now() - interval '3 minutes';
```

Hard delete only via product `delete-note` / account delete — respect RLS and storage.

---

## Out of scope

- Supabase Pro (400s wall-clock) — optional later; does not fix hung Gemini.
- Full job queue — only if split + timeout still fail often.
- Logging transcripts / audio in cleanup paths.

---

## Acceptance

- [ ] Hung Gemini → `extraction_failed` within ~30s, never bare 546 with stuck `extracting`
- [ ] Client can retry extract-only on notes with transcript
- [ ] Stale `extracting` (>3 min) auto-flips to `extraction_failed`
- [ ] User can delete abandoned / junk notes; audio removed
- [ ] Happy path still reaches `review_ready` under Free plan
- [ ] No silent wipe of transcripts on timeout

---

## Ship checklist (files)

1. `task-extraction-provider.ts` — AbortSignal / timeout  
2. `process-note/index.ts` — optional early return after transcribe; fail path sets `extraction_failed`  
3. App notes service / capture sheet — two-step invoke + Retry on `extraction_failed`  
4. Stale reclaim (Edge claim start or small SQL/cron) — shipped as `noteLifecycle().reclaimStuckExtracting()` in `_shared/notes/note-lifecycle.ts`, called at the start of `extract-note`  
5. UI: delete abandoned note (wire `delete-note`)  
6. Tests: timeout → failed status; stale reclaim; extract-only claim  
7. One-off: flip current stuck rows in hosted (`5b597706-…`, `fca4d3e6-…`, any similar)

---

## Incident snapshot (2026-10-20)

- Shutdown reason: `WallClockTime` · mem ~23MB · CPU ~134ms · Free org  
- Pattern: `start` → `transcribe_ok` → no extract log → 546 ~150s later  
- Stuck DB: `status = extracting`, transcript present
