# Leftovers — what remains to finish the project

Last updated: 2026-10-24 (`dispatch-reminders-every-minute` + `purge-note-audio-hourly` live on hosted; device smoke still manual).

Phases **0–7** are done. Code polish from this leftover pass is also in the app. Marketing landing is on Vercel — see [20_STATUS.md](./20_STATUS.md) + [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md).  
Scope: [02_V1_SCOPE.md](./02_V1_SCOPE.md).

---

## YOU DO THESE (manual — cannot be finished in-repo)

### A. Ops / secrets (blocks live AI + reminders)

| # | Item | Done? |
|---|---|---|
| A1 | Set Edge secret: `GOOGLE_API_KEY` (optional `AI_CHAT_MODEL` / `AI_TRANSCRIPTION_MODEL`) | [ ] |
| A2 | Set Edge secret `CRON_SECRET` (must match Vault `cron_secret`) | [x] |
| A3 | Schedule `dispatch-reminders` ~every 1 min with header `x-cron-secret: <CRON_SECRET>` (Dashboard Cron or pg_cron + Vault) | [x] |
| A4 | Set `ENABLE_DEBUG_FUNCTIONS=true` briefly, verify `openai-spike` → `config` → `chat`, unset it, then record a real note | [ ] |
| A5 | **Rotate** any provider key that appeared in git; purge history or unblock after rotate so `git push` works | [ ] |
| A6 | Fix Auth SMTP on hosted (signup 500). Auth logs: Gmail `535 BadCredentials` / “Username and Password not accepted”. Dashboard → Authentication → Emails → SMTP: use a **Google App Password** (not normal Gmail password), or switch to Resend SMTP. Then confirm OTP templates still use `{{ .Token }}` (8-digit). Retry sign-up | [ ] |
| A7 | Re-read Google Gemini + Supabase terms before broader launch | [ ] |
| A8 | `20261022140000_audio_retention` is applied. Do not edit that file | [x] |
| A9 | Redeploy Edge `purge-note-audio` (`verify_jwt` off) and `extract-note` after A11. `note-audio` / `process-note` have no further change for this rule | [ ] |
| A10 | Schedule `purge-note-audio` hourly with header `x-cron-secret: <CRON_SECRET>` if it is not already scheduled. Use `pg_cron`+`pg_net` + Vault (SQL example in [09_NOTIFICATIONS_EMAIL_CRON.md](./09_NOTIFICATIONS_EMAIL_CRON.md)). Do not commit the secret | [x] |
| A11 | Apply migration `20261022160000_audio_purge_any_status` (`list_orphan_note_audio` only). Do this before relying on orphan cleanup | [ ] |
| A12 | `20261022180000_count_ai_usage_ownership` is applied and does not raise (definer owner exemption). Do not edit it | [x] |
| A13 | Apply `20261022200000_count_ai_usage_invoker`. No function redeploy. As user A, `count_ai_usage_today(B)` must raise `42501`, not return 0 or B’s count | [ ] |
| A14 | Redeploy all Edge functions except `health` (2026-10-23 shared-module refactor; no migration). Smoke: record → transcript → suggestions; reject a suggestion; delete a note | [ ] |

### B. Device smoke (blocks private beta confidence)

| # | Item | Done? |
|---|---|---|
| B1 | Sign in / session restore on real iOS or Android | [ ] |
| B2 | Record ≤60s → transcript → suggestions → approve → task survives restart | [ ] |
| B3 | Enable push; schedule reminder; confirm `notification_deliveries` (+ push if allowed) | [ ] |
| B4 | Delete note (audio gone); delete account (cannot sign in) | [ ] |
| B5 | Denied mic / denied notification show clear errors | [ ] |
| B6 | Backgrounding / call during recording does not corrupt note | [ ] |

### C. Live RLS / release (blocks broader launch)

| # | Item | Done? |
|---|---|---|
| C1 | Run two-user deny cases (`supabase/tests/rls_phase6_phase7.sql`) on hosted/local | [ ] |
| C2 | Cross-user zero access: notes, tasks, suggestions, reminders, audio, deliveries, and `count_ai_usage_today` (`42501` for another user’s id) | [ ] |
| C3 | Anon denied on user tables / claim-approve RPCs | [ ] |
| C4 | Approve twice → one task; extraction retry no duplicate pendings (manual/integration) | [ ] |
| C5 | Production/preview build + secret scan clean | [ ] |
| C6 | Optional: wire local Supabase RLS suite into CI | [ ] |

### E. Vercel deploy follow-ups (marketing + product web)

| # | Item | Done? |
|---|---|---|
| E1 | Confirm landing env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Production + Preview) | [x] |
| E2 | Smoke waitlist on https://saydooo.vercel.app/early-access (new email + duplicate) | [ ] |
| E3 | Set `VITE_APP_URL=https://getsaydo.vercel.app` and redeploy landing | [x] |
| E4 | Optional custom domains (`saydo.com` / `app.saydo.com`) | [ ] |
| E5 | Keep landing Root Directory = `LandingPage`; do not re-include `vite.config.ts` in `tsc` without `@types/node` | [x] (process) |
| E6 | Expo web project `getsaydo` live; SPA rewrite excludes `/_expo/` | [x] |
| E7 | Supabase Auth allowlist includes `https://getsaydo.vercel.app` | [ ] |
| E8 | Smoke product sign-in / sign-up on https://getsaydo.vercel.app/sign-in | [ ] |

### D. Optional / later (not required for private beta)

| Item | Notes |
|---|---|
| Resend transactional email channel | Needs `RESEND_API_KEY` + domain; schema has `email` channel |
| Reminder quiet hours / disable push UI | `profiles.push_enabled` column exists (default true); UI + dispatcher check not wired |
| Sentry client crash/error + performance monitoring | Before beta/store builds — [24_SENTRY_PLAN.md](./24_SENTRY_PLAN.md) |
| Cost/latency dashboard or billing alerts | `ai_usage_events` rows exist; no BI UI |
| Formal privacy policy URL / legal review | In-app disclosure exists |
| Server FTS (Postgres) | In-memory note/task search is enough for V1 volume |
| Job queue for AI | Only if Edge timeouts bite |
| OAuth / magic links | Out of V1 |
| P2 features | Widgets, teams, calendar bots, semantic search, billing — [02_V1_SCOPE.md](./02_V1_SCOPE.md) |

---

## DONE IN CODE (this leftover pass — no action needed)

| Area | Shipped |
|---|---|
| Note title + transcript edit | Note detail save → `title` / `edited_transcript` |
| Note search | Home search over title + display transcript |
| Suggestion kind / due / priority edit | Pending suggestion card before approve |
| Manual task create | `create_manual_task` RPC + `/(app)/tasks/new` |
| Task due edit | Date + optional time in the edit sheet (web: native pickers; native: typed `YYYY-MM-DD` / `HH:mm`) — 2026-10-24 |
| Task delete | Task detail + list trash icons hard-delete |
| Archive removed | Migration `remove_archive` (applied on hosted): archived tasks → `completed`, archived notes → `review_ready`/`draft`; `archived` dropped from `task_status` / `note_status` |
| Content-free analytics | `trackProductEvent` (approve, complete, reminder, extraction) — no transcript/audio |
| Migration `leftover_polish` | Applied on hosted (`push_enabled`, `create_manual_task`) |

**Tests:** `npm test` — 113 passed · `npm run typecheck` — pass (after Href fix).

---

## Suggested order for you

1. **A5** rotate/purge key so push works  
2. **A1–A4** secrets + cron + spike  
3. **B1–B4** device smoke  
4. **C1–C3** RLS two-user pass  
5. Only then optional **D** items  

---

## References

- [20_STATUS.md](./20_STATUS.md)  
- [13_IMPLEMENTATION_PLAN.md](./13_IMPLEMENTATION_PLAN.md)  
- [08_SECURITY_AND_PRIVACY.md](./08_SECURITY_AND_PRIVACY.md)  
- [12_TESTING_STRATEGY.md](./12_TESTING_STRATEGY.md)  
- [17_DECISIONS.md](./17_DECISIONS.md)  
