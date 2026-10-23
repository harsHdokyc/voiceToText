# Project Status
Last updated: 2026-10-24 (Phases 0–7 complete + 3-day voice-audio retention + user time zone / due times live. Edge shared-module refactor is live in `extract-note` only).

## Current phase
**Phases 0–7 complete** against plan exit criteria (see inventory below). Hosted backend: [voiceToWork](https://supabase.com/dashboard/project/ubqhyeicmgmdzethtids).
**AI provider:** Google Gemini via LangChain + `@google/genai` (see [17_DECISIONS.md](./17_DECISIONS.md)).
**Product UI:** Saydo workspace/dashboard (+ auth) from `ui/goals-in-motion-55` reference — see [22_ui-execution-planner.md](./22_ui-execution-planner.md) (Steps 1–13).
**Marketing:** Vite app in `LandingPage/` on **Vercel** + `waitlist` on the same hosted project — see [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md).

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
| Timezone picker / native due picker | Zone auto-syncs from device (no manual picker). Native edit sheet types `YYYY-MM-DD` / `HH:mm`; web has native pickers |

### Phase 7 — Beta hardening
**Shipped:** Edge `delete-note`, `delete-account`; Settings privacy disclosure + push enable + account delete; note delete; `ai_usage_events` + daily process-note cap (40); Vitest policy inventory; `supabase/tests/rls_phase6_phase7.sql` checklist; provider-terms note in DECISIONS.

**Intentionally left**
| Leftover | Lands in / notes |
|---|---|
| Physical iOS/Android smoke (push, record, delete) | Manual checklist below — cannot automate here |
| Full two-user RLS CI against live DB | Checklist SQL; run before broader launch |
| Cost dashboards / billing alerts | Metrics rows exist; no BI UI |
| Transcript/note title editors, FTS, manual task create | Earlier-phase polish / P1 |

### Audio retention (2026-10-22)
**Rule:** 3 days after recording is the retry window. Any `note-audio` file that old is deleted, whatever the note status and whether a transcript exists. The note row stays. A purged note with a transcript can re-extract. With neither file nor transcript, retry is hidden and the screen says why.

**Schema:** `20261022140000_audio_retention` (applied; do not edit) adds `audio_purged_at` and `notes_audio_retention_idx`. `20261022160000_audio_purge_any_status` (applied) adds `list_orphan_note_audio` for bucket objects no note still references.

**Live:** `purge-note-audio` v5 (`verify_jwt = false`), pg_cron `purge-note-audio-hourly` (`0 * * * *`, active), same `x-cron-secret` header as reminders.

### Edge shared-module refactor (2026-10-23)
**Shipped in repo:** `_shared/http.ts` (fail envelope), `_shared/notes/note-lifecycle.ts` (note status machine), `_shared/service-role.ts` (service client + cron secret). Fixes: reject no longer reports `ok` after losing a race; approve rejects a bad `due_at` with 400; DB reasons containing `503` keep their machine code; `dispatch-reminders` / `purge-note-audio` pass `deno check`; `openai-spike` gated by `ENABLE_DEBUG_FUNCTIONS`. Why: [17_DECISIONS.md](./17_DECISIONS.md) (2026-10-23). Terms: [25_GLOSSARY.md](./25_GLOSSARY.md).

**Ops:** No migration. `extract-note` is redeployed (v14); redeploy the rest except `health`. Do not set `ENABLE_DEBUG_FUNCTIONS` on hosted except briefly for a probe.

### User time zone + due times (2026-10-24)
**Live on hosted:** migration `20261023190000_user_timezone_day` (`is_valid_timezone`, check `profiles_timezone_valid`, `count_ai_usage_today` from local midnight) and `extract-note` v14 (`_shared/time/user-time.ts`: speaker's local time in the prompt, naive `due_at` read in the user's zone).
**App:** `getOwnProfile` syncs the device zone into `profiles.timezone`. Due labels show the time (`Today · 2:00 pm`) and timed dues go overdue once the time passes. Edit sheet has date + time; web fields open the browser picker on click. Notes grid lays out explicit rows (no early wrap). Terms: [25_GLOSSARY.md § Time](./25_GLOSSARY.md#time). Why: [17_DECISIONS.md](./17_DECISIONS.md) (2026-10-23, 2026-10-24).
**Known:** suggestions extracted before this keep their old dues — re-record or edit. Rebuild the Docker portal image to pick up the app changes.

### Docker web builds (2026-10-23)
`docker compose up --build -d` → portal web http://localhost:3000, landing http://localhost:8080 (nginx, SPA fallback). Verified: both 200 on `/` and deep links; Supabase URL in the portal bundle; no `.env` / access token in either image. Native apps stay on EAS. See [14_SETUP_AND_SOURCE_LOG.md](./14_SETUP_AND_SOURCE_LOG.md#docker-web-builds).

### Physical device smoke (Phase 7)
- [ ] Sign in / session restore on device
- [ ] Record ≤60s note → transcript → suggestions → approve → task appears after restart
- [ ] Enable push; schedule 1h reminder; confirm delivery attempt row (and push if permission granted)
- [ ] Delete note (audio gone); delete account (cannot sign in)

### Ops still required
1. Edge secrets: `GOOGLE_API_KEY`, **`CRON_SECRET`** (optional model overrides `AI_*`)
2. Schedule `dispatch-reminders` every minute with header `x-cron-secret: <CRON_SECRET>`
3. Redeploy the remaining Edge functions (all except `health` and `extract-note`) for the 2026-10-23 shared-module refactor (no migration)
4. Re-check Google Gemini + Supabase terms before public launch

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
| Note detail | Transcript, suggestion approve/dismiss, retry, **delete note**, category. Purged audio shows “Audio deleted after 3 days” instead of the waveform |
| Suggestions | Global pending inbox; Approve / Approve all / Edit (approve-with-edits) / Dismiss |
| Tasks | Open/Completed/All; complete; edit sheet (due date + optional time + 1h/3h/1d reminder); delete; source note |
| Settings | Display name persist; privacy; push; sign out; delete account; Developer collapsed |

## AI / Edge
| Function | Notes |
|---|---|
| `process-note` | STT only + **rate limit** + **ai_usage_events**; leaves note `extracting` |
| `extract-note` | Suggestions + title/category → `review_ready`; stale reclaim; re-extract after audio purge |
| `note-audio` | Upload/download by noteId |
| `approve-suggestion` / `reject-suggestion` | Review path |
| `register-push-token` | Upsert Expo token |
| `dispatch-reminders` | Cron; claim → Expo push → delivery ledger |
| `purge-note-audio` | Cron; delete `note-audio` files ≥3 days old (any status) plus unreferenced orphans; keep the note row |
| `delete-note` / `delete-account` | Storage cleanup + DB wipe / auth delete |
| `openai-spike` / `health` | Debug (spike slug historical; probes Gemini). `openai-spike` 404s unless `ENABLE_DEBUG_FUNCTIONS=true` |

## Deployed backend
| Item | Status |
|---|---|
| Migrations through `phase7_hardening` + `waitlist` | Applied on hosted |
| `20261022140000_audio_retention` | Applied (do not edit) |
| `20261022160000_audio_purge_any_status` | Applied |
| `20261022180000_count_ai_usage_ownership` | Applied. Does not raise (definer owner exemption). Do not edit |
| `20261022200000_count_ai_usage_invoker` | Applied |
| `20261023190000_user_timezone_day` | Applied (2026-10-24) |
| Edge functions above | All ACTIVE. `extract-note` v14 has the shared-module refactor + user time; the others predate the refactor |
| pg_cron | `purge-note-audio-hourly` active. `dispatch-reminders` not scheduled |
| Marketing static site | Vercel ← `LandingPage/` (see Marketing deploy above) |

## Logging
See [16_LOGGING_COMBINED.md](./16_LOGGING_COMBINED.md).

## Tests
| Command | Last result |
|---|---|
| `npm run typecheck` | Clean (2026-10-24). Do not run `npm audit fix --force`: it jumps to Expo 58 / Tailwind 4, which breaks NativeWind (v3 only) and typecheck |
| `npm test` | 269 passed, 3 skipped (2026-10-24). `test/rls/count-ai-usage-today.test.ts` needs Linux `sudo -u postgres psql`; it fails on Windows |
| `npm run lint` | Clean (2026-10-23) |
| `deno check` (per function, `npx deno@2 check --no-lock index.ts`) | All 12 functions pass (2026-10-23); `extract-note` re-checked 2026-10-24 |

**Policy:** Unit tests under `test/` (`vitest` include `test/**/*.test.ts`). Behavior tests for pure helpers (greeting/display name, due presets, capture timer, live-dictation concat, dueLabel, etc.).

## Next slice
**Saydo workspace UI (planner Steps 1–13) shipped in Expo. Marketing landing shipped on Vercel** (waitlist wired). Remaining work is mostly **manual / ops** — see **[18_LEFTOVER.md](./18_LEFTOVER.md)** §YOU DO THESE (secrets, cron, device smoke, RLS two-user) and §E marketing deploy follow-ups. Optional later: custom domain, invite mail, custom reminder datetime picker.

## Locked decisions
See [17_DECISIONS.md](./17_DECISIONS.md).

## Blockers
None for code exit. Live reminders need `CRON_SECRET` + cron schedule; live AI needs `GOOGLE_API_KEY` Edge secret.
