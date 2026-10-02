# Project Status
Last updated: 2026-10-02 (Phase 4 complete).

## Current phase
**Phases 2–4 complete** (notes + private audio + transcription + task extraction + review UI). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).
**AI prototype provider:** Naga via OpenAI SDK (see [DECISIONS.md](./DECISIONS.md)).

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
| Note detail | Polls while queued/transcribing/extracting; shows transcript + suggestions; approve/reject |
| Suggestions service | fetch/approve/reject suggestions |
| Audio access | Client uses `noteId` only; Edge `note-audio` proxy; `audio_path` never returned to app |
| Status helpers | `src/features/notes/services/note-status.ts` |
| Notes service | create / proxy-upload / invoke / retry |

## AI (Edge)
| Piece | Location / notes |
|---|---|
| Config + client | `supabase/functions/_shared/ai/` |
| Transcription adapter | `transcription-provider.ts` → `whisper-large-v3:free` |
| Extraction adapter | `task-extraction-provider.ts` → full TaskSuggestionSchema, scout + free fallbacks |
| Spike | `openai-spike` probes: `config` \| `chat` \| `transcribe` |
| Audio proxy | `note-audio` — upload/download by `noteId` (no storage key to client) |
| Process | `process-note` — claim queued note → download → Whisper → extract → `review_ready` |
| Approve suggestion | `approve-suggestion` — atomic task creation via RPC |
| Reject suggestion | `reject-suggestion` — mark suggestion as rejected |

**Manual secret setup (required for live AI):** In Supabase Dashboard → Edge Functions → Secrets set:
- `OPENAI_API_KEY` = Naga API key
- `OPENAI_BASE_URL` = `https://api.naga.ac/v1`
- `AI_TRANSCRIPTION_MODEL` = `whisper-large-v3:free` (optional; this is the default)
- `AI_CHAT_MODEL` = `llama-4-scout-17b-16e-instruct:free` (optional; this is the default)

## Deployed backend
| Item | Status |
|---|---|
| Migration `phase0_profiles` | Applied |
| Migration `phase2_notes_storage` | Applied (notes, tasks, suggestions, `note-audio` bucket + RLS) |
| Migration `phase4_approve_rpc` | Applied (approve_suggestion RPC function) |
| Edge `health` | ACTIVE |
| Edge `openai-spike` | ACTIVE |
| Edge `process-note` | ACTIVE (Phase 4: extraction after transcription) |
| Edge `note-audio` | ACTIVE (v2, verify_jwt) — upload/download by noteId |
| Edge `approve-suggestion` | NEW (atomic task creation) |
| Edge `reject-suggestion` | NEW (mark suggestion rejected) |
| App `.env` | Hosted URL + publishable key |

## Logging
Structured `[vtw]` pretty JSON in Metro (app) and Edge Function logs. See [LOGGING_COMBINED.md](./LOGGING_COMBINED.md).

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 53 passed (+ Phase 4 tests pending verification) |

**Policy:** Unit tests side-by-side with pure logic; each test must fail if the **business rule** breaks — not if a mock wasn’t called (`.cursor/rules/07-testing.mdc`).

## Next slice
Phase 5 — task management/search (list, edit, complete, basic search, source note link).

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
Naga `:free` chat upstreams still 503 intermittently — extraction retries across fallback models; notes correctly land in `extraction_failed` (not stuck in `extracting`).
