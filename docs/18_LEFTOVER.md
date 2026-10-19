# Leftovers — what remains to finish the project

Last updated: 2026-10-19 (code leftovers shipped; marketing on Vercel; **manual items left for you**).

Phases **0–7** are done. Code polish from this leftover pass is also in the app. Marketing landing is on Vercel — see [STATUS.md](./20_STATUS.md) + [LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md).  
Scope: [02_V1_SCOPE.md](./02_V1_SCOPE.md).

---

## YOU DO THESE (manual — cannot be finished in-repo)

### A. Ops / secrets (blocks live AI + reminders)

| # | Item | Done? |
|---|---|---|
| A1 | Set Edge secret: `GOOGLE_API_KEY` (optional `AI_CHAT_MODEL` / `AI_TRANSCRIPTION_MODEL`) | [ ] |
| A2 | Set Edge secret `CRON_SECRET` | [ ] |
| A3 | Schedule `dispatch-reminders` ~every 1 min with header `x-cron-secret: <CRON_SECRET>` (Dashboard Cron or pg_cron + Vault) | [ ] |
| A4 | Verify `openai-spike` → `config` → `chat`, then record a real note | [ ] |
| A5 | **Rotate** any provider key that appeared in git; purge history or unblock after rotate so `git push` works | [ ] |
| A6 | Confirm Auth email OTP templates on hosted Supabase | [ ] |
| A7 | Re-read Google Gemini + Supabase terms before broader launch | [ ] |

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
| C2 | Cross-user zero access: notes, tasks, suggestions, reminders, audio, deliveries | [ ] |
| C3 | Anon denied on user tables / claim-approve RPCs | [ ] |
| C4 | Approve twice → one task; extraction retry no duplicate pendings (manual/integration) | [ ] |
| C5 | Production/preview build + secret scan clean | [ ] |
| C6 | Optional: wire local Supabase RLS suite into CI | [ ] |

### E. Marketing deploy follow-ups (Vercel)

| # | Item | Done? |
|---|---|---|
| E1 | Confirm Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Production + Preview) | [ ] |
| E2 | Smoke waitlist on production URL (new email + duplicate) | [ ] |
| E3 | Set `VITE_APP_URL` to real product web URL | [ ] |
| E4 | Optional custom domain on Vercel | [ ] |
| E5 | Keep Root Directory = `LandingPage`; do not re-include `vite.config.ts` in `tsc` without `@types/node` | [ ] (process) |

### D. Optional / later (not required for private beta)

| Item | Notes |
|---|---|
| Resend transactional email channel | Needs `RESEND_API_KEY` + domain; schema has `email` channel |
| Reminder quiet hours / disable push UI | `profiles.push_enabled` column exists (default true); UI + dispatcher check not wired |
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
| Note archive | Archive action (status machine) |
| Suggestion kind / due / priority edit | Pending suggestion card before approve |
| Manual task create | `create_manual_task` RPC + `/(app)/tasks/new` |
| Task due edit | YYYY-MM-DD on task detail |
| Task archive / delete | Task detail actions + archived filter |
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

- [STATUS.md](./STATUS.md)  
- [13_IMPLEMENTATION_PLAN.md](./13_IMPLEMENTATION_PLAN.md)  
- [08_SECURITY_AND_PRIVACY.md](./08_SECURITY_AND_PRIVACY.md)  
- [12_TESTING_STRATEGY.md](./12_TESTING_STRATEGY.md)  
- [DECISIONS.md](./DECISIONS.md)  
