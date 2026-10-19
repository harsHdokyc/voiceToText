# Project Status
Last updated: 2026-10-19 (Phases 0–7 complete + Saydo workspace UI + landing on Vercel).

## Current phase
**Phases 0–7 complete** against plan exit criteria (see inventory below). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).
**AI provider:** Google Gemini via LangChain + `@google/genai` (see [DECISIONS.md](./17_DECISIONS.md)).
**Product UI:** Saydo workspace/dashboard (+ auth) from `ui/goals-in-motion-55` reference — see [ui-execution-planner.md](./22_ui-execution-planner.md) (Steps 1–13).
**Marketing:** Vite app in `LandingPage/` on **Vercel** + `waitlist` on the same hosted project — see [LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md).

Living phase map: [13_IMPLEMENTATION_PLAN.md](./13_IMPLEMENTATION_PLAN.md). P0/P1/P2: [02_V1_SCOPE.md](./02_V1_SCOPE.md).

## Marketing deploy (Vercel) — progress

| Item | Status |
|---|---|
| Host | **Vercel** (GitHub `harsHdokyc/voiceToText`, branch `main`) |
| Root Directory | `LandingPage` |
| Build | `npm run build` (`prebuild` = `tsc -b`, then `vite build`) |
| Backend | Same Supabase project; `public.waitlist` live (RLS insert-only; rows present on hosted) |
| Env at build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (optional `VITE_APP_URL` for Sign-in links) |
| Green deploy | Yes — e.g. `f3c3219` (PR #2 merge) built + deployed |
| Lenis smooth scroll | On `main` (`b134cf4`); included once Vercel builds that commit or later |
| Known fail (fixed) | `e9b19b1` — `tsc` typechecked `vite.config.ts` → missing `node:url` types. Reverted include in `3dbf7e9` |
| Harmless warning | Vite may log `Cannot find base config file "expo/tsconfig.base"` (parent Expo `tsconfig`); does not fail the build |
| Production URL | https://saydooo.vercel.app/ |
| SPA refresh 404 | Fixed via `LandingPage/vercel.json` rewrite → `index.html` |
| Custom domain | Optional; Vercel URL above until set |

Details / ops checklist: [21_LANDING_ARCHITECTURE.md § Deployment](./21_LANDING_ARCHITECTURE.md#deployment-vercel).

## Phase inventory + intentional leftovers

| Phase | Plan exit | Met? |
|---|---|---|
| 0 Runtime spike | Auth, migration, Edge function, small Gemini request | **yes** (live secrets = ops) |
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
1. Edge secrets: `GOOGLE_API_KEY`, **`CRON_SECRET`** (optional model overrides `AI_*`)
2. Schedule `dispatch-reminders` every minute with header `x-cron-secret: <CRON_SECRET>`
3. Re-check Google Gemini + Supabase terms before public launch

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
| Overview | Greeting from `profiles.display_name`; cobalt capture band; recent notes + review/task previews |
| Voice notes | Category chips Work/Ideas/Personal; search; card grid; detail + suggestions |
| Capture | In-shell modal ≤60s `expo-audio` → upload → process-note (optional web live preview) |
| Note detail | Transcript, suggestion approve/dismiss, retry, **delete note**, category |
| Suggestions | Global pending inbox; Approve / Approve all / Edit (approve-with-edits) / Dismiss |
| Tasks | Open/Completed/All; complete; edit sheet (due + 1h/3h/1d reminder); archive; source note |
| Settings | Display name persist; privacy; push; sign out; delete account; Developer collapsed |

## AI / Edge
| Function | Notes |
|---|---|
| `process-note` | STT + extract + **rate limit** + **ai_usage_events** |
| `note-audio` | Upload/download by noteId |
| `approve-suggestion` / `reject-suggestion` | Review path |
| `register-push-token` | Upsert Expo token |
| `dispatch-reminders` | Cron; claim → Expo push → delivery ledger |
| `delete-note` / `delete-account` | Storage cleanup + DB wipe / auth delete |
| `openai-spike` / `health` | Debug (spike slug historical; probes Gemini) |

## Deployed backend
| Item | Status |
|---|---|
| Migrations through `phase7_hardening` + `waitlist` | Applied on hosted |
| Edge functions above | ACTIVE (register-push-token, dispatch-reminders, delete-note, delete-account, process-note redeployed) |
| Marketing static site | Vercel ← `LandingPage/` (see Marketing deploy above) |

## Logging
See [LOGGING_COMBINED.md](./LOGGING_COMBINED.md).

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Pass (2026-10-19) |
| `npm test` | 141 passed / 25 files (2026-10-19) |

**Policy:** Unit tests under `test/` (`vitest` include `test/**/*.test.ts`). Behavior tests for pure helpers (greeting/display name, due presets, capture timer, live-dictation concat, dueLabel, etc.).

## Next slice
**Saydo workspace UI (planner Steps 1–13) shipped in Expo. Marketing landing shipped on Vercel** (waitlist wired). Remaining work is mostly **manual / ops** — see **[LEFTOVER.md](./18_LEFTOVER.md)** §YOU DO THESE (secrets, cron, device smoke, RLS two-user) and §E marketing deploy follow-ups. Optional later: custom domain, invite mail, custom reminder datetime picker.

## Locked decisions
See [DECISIONS.md](./DECISIONS.md).

## Blockers
None for code exit. Live reminders need `CRON_SECRET` + cron schedule; live AI needs `GOOGLE_API_KEY` Edge secret.
