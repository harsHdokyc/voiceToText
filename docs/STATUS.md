# Project Status
Last updated: 2026-10-02.

## Current phase
**Phases 2–3 complete** (notes + private audio + transcription). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).  
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
| Record | `expo-audio` ≤60s → draft note → upload → `process-note` |
| Note detail | Polls while queued/transcribing; shows transcript; retry |
| Status helpers | `src/features/notes/services/note-status.ts` |
| Notes service | create/upload/invoke/retry in `notes-service.ts` |

## AI (Edge)
| Piece | Location / notes |
|---|---|
| Config + client | `supabase/functions/_shared/ai/` |
| Transcription adapter | `transcription-provider.ts` → `whisper-large-v3:free` |
| Extraction adapter | `task-extraction-provider.ts` → scout + free fallbacks |
| Spike | `openai-spike` probes: `config` \| `chat` \| `transcribe` |
| Process | `process-note` — claim queued note → download → Whisper → `review_ready` |

**Manual secret setup (required for live AI):** In Supabase Dashboard → Edge Functions → Secrets set:
- `OPENAI_API_KEY` = Naga API key
- `OPENAI_BASE_URL` = `https://api.naga.ac/v1`
- `AI_TRANSCRIPTION_MODEL` = `whisper-large-v3:free` (optional; this is the default)
- `AI_CHAT_MODEL` = `llama-4-scout-17b-16e-instruct:free` (optional; this is the default)
  - If chat returns 503 upstream unavailable: retry, or set another free model (`nex-n2.5-mini:free`, etc.)

Then re-invoke `openai-spike` from the app (`{ "probe": "config" }` then `{ "probe": "chat" }` / `transcribe`).

## Deployed backend
| Item | Status |
|---|---|
| Migration `phase0_profiles` | Applied |
| Migration `phase2_notes_storage` | Applied (notes, tasks, suggestions, `note-audio` bucket + RLS) |
| Edge `health` | ACTIVE |
| Edge `openai-spike` | ACTIVE |
| Edge `process-note` | ACTIVE (v1, verify_jwt) |
| App `.env` | Hosted URL + publishable key |

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 45 passed (auth helpers, note-status, recording-format, env, query-retry, AI provider-utils) |

**Policy:** Unit tests side-by-side with pure logic; each test must fail if the **business rule** breaks — not if a mock wasn’t called (`.cursor/rules/07-testing.mdc`, [12_TESTING_STRATEGY.md](./12_TESTING_STRATEGY.md)).

## Next slice
Phase 4 — task extraction + review UI (edit/approve/reject suggestions).

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
Live Naga transcription/chat wait on Edge secrets being set in the dashboard (key never committed).
