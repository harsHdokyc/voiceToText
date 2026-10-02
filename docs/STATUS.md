# Project Status
Last updated: 2026-10-02 (Phase 4 review/approve hardened).

## Current phase
**Phases 2–4 complete** (notes + private audio + transcription + task extraction + review/edit/approve/reject). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).
**AI provider:** official OpenAI via OpenAI SDK (see [DECISIONS.md](./DECISIONS.md)).

## Auth (app)
| Screen | Path |
|---|---|
| Sign in | `/(auth)/sign-in` |
| Sign up | `/(auth)/sign-up` → OTP if confirmation required |
| Verify OTP | `/(auth)/verify-otp` (`signup` \| `recovery`) |
| Forgot password | `/(auth)/forgot-password` → OTP |
| Reset password | `/(auth)/reset-password` (after recovery OTP) |

## Notes / recording (app)
| Piece | Notes |
|---|---|
| Home | Lists notes; link to record + settings |
| Record | `expo-audio` ≤60s → draft → **note-audio proxy upload** → `process-note` |
| Note detail | Polls while queued/transcribing/extracting; transcript + editable pending suggestions; approve/reject with errors |
| Suggestions service | list / edit-diff / approve / reject (`buildSuggestionEdits`, pending-only actions) |
| Audio access | Client uses `noteId` only; Edge `note-audio` proxy; `audio_path` never returned to app |
| Status helpers | `src/features/notes/services/note-status.ts` |
| Notes service | create / proxy-upload / invoke / retry |

## AI (Edge)
| Piece | Location / notes |
|---|---|
| Config + client | `supabase/functions/_shared/ai/` |
| Transcription adapter | `transcription-provider.ts` → `gpt-4o-mini-transcribe` |
| Extraction adapter | `task-extraction-provider.ts` → full TaskSuggestionSchema, `gpt-4o-mini` |
| Spike | `openai-spike` probes: `config` \| `chat` \| `transcribe` |
| Audio proxy | `note-audio` — upload/download by `noteId` (no storage key to client) |
| Process | `process-note` — claim → download → transcribe → extract → `review_ready` |
| Approve suggestion | `approve-suggestion` — atomic task creation via RPC (edits persisted) |
| Reject suggestion | `reject-suggestion` — mark suggestion as rejected |

**Manual secret setup (required for live AI):** In Supabase Dashboard → Edge Functions → Secrets, **replace** any old Naga values with:
- `OPENAI_API_KEY` = OpenAI secret key
- `OPENAI_BASE_URL` = `https://api.openai.com/v1`
- `AI_TRANSCRIPTION_MODEL` = `gpt-4o-mini-transcribe` (optional; this is the default)
- `AI_CHAT_MODEL` = `gpt-4o-mini` (optional; this is the default)

Code defaults match the above if those secrets are unset — but **existing Naga secrets override defaults** until updated.

## Deployed backend
| Item | Status |
|---|---|
| Migration `phase0_profiles` | Applied |
| Migration `phase2_notes_storage` | Applied (notes, tasks, suggestions, `note-audio` bucket + RLS) |
| Migration `phase4_approve_rpc` | Applied |
| Migration `phase4_approve_rpc_harden` | Applied (title validate, persist edits, revoke anon/public execute) |
| Migration `phase4_suggestion_task_auth` | Applied (reject-only suggestion update; no client task insert; insert suggestions only while extracting) |
| Edge `health` | ACTIVE |
| Edge `openai-spike` | ACTIVE |
| Edge `process-note` | ACTIVE (Phase 4: extraction after transcription) |
| Edge `note-audio` | ACTIVE — upload/download by noteId |
| Edge `approve-suggestion` | ACTIVE |
| Edge `reject-suggestion` | ACTIVE |
| App `.env` | Hosted URL + publishable key |

## Logging
Structured `[vtw]` pretty JSON in Metro (app) and Edge Function logs. See [LOGGING_COMBINED.md](./LOGGING_COMBINED.md).

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 85 passed |

**Policy:** Unit tests side-by-side with pure logic; each test must fail if the **business rule** breaks — not if a mock wasn’t called (`.cursor/rules/07-testing.mdc`).

## Next slice
Phase 5 — task management/search (list, edit, complete, basic search, source note link). Will need a controlled task-create path (RPC/edge) since client `tasks` INSERT is revoked.

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
Live AI waits on Edge secrets being set to the OpenAI key + base URL (key never committed). After secrets update, verify with `openai-spike` probes `config` → `chat` → then record a note.
