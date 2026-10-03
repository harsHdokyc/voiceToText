# Project Status
Last updated: 2026-10-03 (Phases 0–7 complete).

## Current phase
**Phases 0–7 complete** against plan exit criteria (see inventory below). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).
**AI provider:** official OpenAI via OpenAI SDK (see [DECISIONS.md](./DECISIONS.md)).

Living phase map: [13_IMPLEMENTATION_PLAN.md](./13_IMPLEMENTATION_PLAN.md). P0/P1/P2: [02_V1_SCOPE.md](./02_V1_SCOPE.md).

## Phase inventory + intentional leftovers

| Phase | Plan exit | Met? |
|---|---|---|
| 0 Runtime spike | Auth, migration, Edge function, small OpenAI request | **yes** (live secrets = ops) |
| 1 Auth shell | Session persists; signed-out blocked from app | **yes** |
| 2 Notes + storage | Own upload works; cross-user denied | **partial** → RLS inventory + SQL checklist in Phase 7; live two-user deny still manual |
| 3 Transcription | Recording → transcript; recoverable failure | **yes** |
| 4 Task extraction | One approved task per suggestion | **yes** |
| 5 Task mgmt/search | Persisted tasks usable after restart | **yes** |
| 6 Reminders | Durable reminder + push best-effort; no duplicate delivery rows | **yes** (cron secret + schedule = ops) |
| 7 Beta hardening | Deletion, privacy, rate limits, metrics, RLS tests, device checks, terms review | **yes** (physical device smoke = checklist) |

### Phase 6 — Reminders
**Shipped:** `device_tokens`, `reminders`, `notification_deliveries`; `claim_due_reminders` (service_role); Edge `register-push-token`, `dispatch-reminders` (`x-cron-secret`); app schedule/cancel on task detail; Expo push registration (skips web/simulator).

**Intentionally left**
| Leftover | Lands in / notes |
|---|---|
| Dashboard Cron / pg_cron+Vault wiring | Ops — set `CRON_SECRET`, schedule POST every minute (see DECISIONS) |
| Resend email channel | Optional; schema supports `email` channel |
| Rich timezone picker | UTC schedule + display local; DST handled at boundary only |

### Phase 7 — Beta hardening
**Shipped:** Edge `delete-note`, `delete-account`; Settings privacy disclosure + push enable + account delete; note delete; `ai_usage_events` + daily process-note cap (40); Vitest policy inventory; `supabase/tests/rls_phase6_phase7.sql` checklist; provider-terms note in DECISIONS.

**Intentionally left**
| Leftover | Lands in / notes |
|---|---|
| Physical iOS/Android smoke (push, record, delete) | Manual checklist below — cannot automate here |
| Full two-user RLS CI against live DB | Checklist SQL; run before broader launch |
| Cost dashboards / billing alerts | Metrics rows exist; no BI UI |
| Transcript/note title editors, FTS, manual task create | Earlier-phase polish / P1 |

### Physical device smoke (Phase 7)
- [ ] Sign in / session restore on device
- [ ] Record ≤60s note → transcript → suggestions → approve → task appears after restart
- [ ] Enable push; schedule 1h reminder; confirm delivery attempt row (and push if permission granted)
- [ ] Delete note (audio gone); delete account (cannot sign in)

### Ops still required
1. Edge secrets: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, **`CRON_SECRET`**
2. Schedule `dispatch-reminders` every minute with header `x-cron-secret: <CRON_SECRET>`
3. Re-check OpenAI + Supabase terms before public launch

---

## Auth (app)
| Screen | Path |
|---|---|
| Sign in | `/(auth)/sign-in` |
| Sign up | `/(auth)/sign-up` → OTP if confirmation required |
| Verify OTP | `/(auth)/verify-otp` (`signup` \| `recovery`) |
| Forgot password | `/(auth)/forgot-password` → OTP |
| Reset password | `/(auth)/reset-password` (after recovery OTP) |

## Notes / recording / tasks / reminders (app)
| Piece | Notes |
|---|---|
| Home | Notes list; record + tasks + settings |
| Record | ≤60s → note-audio proxy → process-note |
| Note detail | Transcript, suggestion edit/approve/reject, retry, **delete note** |
| Tasks | List/search/complete/edit + source note link |
| Task detail | Edit + **remind in 1h/3h/1d** + cancel |
| Settings | Privacy disclosure, push enable, account delete, debug probes |

## AI / Edge
| Function | Notes |
|---|---|
| `process-note` | STT + extract + **rate limit** + **ai_usage_events** |
| `note-audio` | Upload/download by noteId |
| `approve-suggestion` / `reject-suggestion` | Review path |
| `register-push-token` | Upsert Expo token |
| `dispatch-reminders` | Cron; claim → Expo push → delivery ledger |
| `delete-note` / `delete-account` | Storage cleanup + DB wipe / auth delete |
| `openai-spike` / `health` | Debug |

## Deployed backend
| Item | Status |
|---|---|
| Migrations through `phase7_hardening` | Applied on hosted |
| Edge functions above | ACTIVE (register-push-token, dispatch-reminders, delete-note, delete-account, process-note redeployed) |

## Logging
See [LOGGING_COMBINED.md](./LOGGING_COMBINED.md).

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 108 passed |

**Policy:** Unit tests under `test/` (`vitest` include `test/**/*.test.ts`).

## Next slice
V1 private beta ops: set `CRON_SECRET` + schedule dispatcher; run physical device smoke; optional P1 (FTS search, Resend, richer deletion UX).

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
None for code exit. Live reminders need `CRON_SECRET` + cron schedule; live AI needs OpenAI Edge secrets.
