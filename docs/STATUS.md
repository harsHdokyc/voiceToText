# Project Status
Last updated: 2026-10-02.

## Current phase
**Phase 1 auth complete.** Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).  
**AI prototype provider:** Naga via OpenAI SDK (see [DECISIONS.md](./DECISIONS.md)).

## Auth (app)
| Screen | Path |
|---|---|
| Sign in | `/(auth)/sign-in` |
| Sign up | `/(auth)/sign-up` → OTP if confirmation required |
| Verify OTP | `/(auth)/verify-otp` (`signup` \| `recovery`) |
| Forgot password | `/(auth)/forgot-password` → OTP |
| Reset password | `/(auth)/reset-password` (after recovery OTP) |

## AI (Edge)
| Piece | Location / notes |
|---|---|
| Config + client | `supabase/functions/_shared/ai/` |
| Transcription adapter | `transcription-provider.ts` → `whisper-large-v3:free` |
| Extraction adapter | `task-extraction-provider.ts` → `llama-3.3-70b-instruct:free` |
| Spike | `openai-spike` probes: `config` \| `chat` \| `transcribe` |

**Manual secret setup (required for live AI):** In Supabase Dashboard → Edge Functions → Secrets set:
- `OPENAI_API_KEY` = Naga API key
- `OPENAI_BASE_URL` = `https://api.naga.ac/v1`
- `AI_TRANSCRIPTION_MODEL` = `whisper-large-v3:free` (optional; this is the default)
- `AI_CHAT_MODEL` = `llama-4-scout-17b-16e-instruct:free` (optional; this is the default)
  - If chat returns 503 upstream unavailable: retry, or set another free model (`nex-n2.5-mini:free`, etc.)

Then re-invoke `openai-spike` from the app (`{ "probe": "config" }` then `{ "probe": "chat" }`).

## Deployed backend
| Item | Status |
|---|---|
| Migration `phase0_profiles` | Applied |
| Edge `health` | ACTIVE |
| Edge `openai-spike` | Redeploy with Naga-aware adapters |
| App `.env` | Hosted URL + publishable key |

## Next slice
Phase 2 — notes + private storage + recording upload (uses transcription adapter).

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
Live Naga calls wait on Edge secrets being set in the dashboard (key never committed).
