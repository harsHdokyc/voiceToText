# Voice-to-Work — docs map
Prepared 2026-10-02. Blueprint for a mobile-first product that turns voice notes into user-approved tasks.

Living status: **[STATUS.md](./STATUS.md)** · Decisions: **[DECISIONS.md](./DECISIONS.md)** · Agent rules: **[../.cursor/rules/](../.cursor/rules/)**

## Read in order
1. [00_PRODUCT_CONTEXT.md](./00_PRODUCT_CONTEXT.md) — problem, hypothesis, principles
2. [01_PRD.md](./01_PRD.md) — goals, requirements, analytics, risks
3. [02_V1_SCOPE.md](./02_V1_SCOPE.md) — P0/P1/P2, note states, acceptance
4. [03_COMPETITOR_RESEARCH.md](./03_COMPETITOR_RESEARCH.md) — landscape and audit protocol
5. [04_POSITIONING_AND_VALIDATION.md](./04_POSITIONING_AND_VALIDATION.md) — messaging, interviews, metrics
6. [05_ARCHITECTURE.md](./05_ARCHITECTURE.md) — stack, flow, client/server boundary
7. [06_AI_PIPELINE.md](./06_AI_PIPELINE.md) — transcription, extraction, prompt rules
8. [07_DATA_MODEL.md](./07_DATA_MODEL.md) — tables, indexes, RLS shape
9. [08_SECURITY_AND_PRIVACY.md](./08_SECURITY_AND_PRIVACY.md) — secrets, Storage, RLS checklist
10. [09_NOTIFICATIONS_EMAIL_CRON.md](./09_NOTIFICATIONS_EMAIL_CRON.md) — push, cron, Resend
11. [10_FOLDER_STRUCTURE.md](./10_FOLDER_STRUCTURE.md) — intended repo layout
12. [11_CODING_STANDARDS.md](./11_CODING_STANDARDS.md) — TypeScript, Expo, Query, Edge
13. [12_TESTING_STRATEGY.md](./12_TESTING_STRATEGY.md) — unit, RLS, integration, release
14. [13_IMPLEMENTATION_PLAN.md](./13_IMPLEMENTATION_PLAN.md) — vertical slices Phase 0–7
15. [14_SETUP_AND_SOURCE_LOG.md](./14_SETUP_AND_SOURCE_LOG.md) — env vars and official docs
16. [15_CURSOR_AGENT_PROMPT.md](./15_CURSOR_AGENT_PROMPT.md) — how agents should work here
17. [LOGGING_COMBINED.md](./LOGGING_COMBINED.md) — structured `[vtw]` logs, scopes, error codes

## Stack correction
Frontend: Expo + React Native + TypeScript. Navigation: Expo Router, not `react-router-dom` in the mobile app. Server state: TanStack Query. Backend: Supabase Auth, PostgreSQL, private Storage, Edge Functions, RLS, Cron (`pg_cron`), optional Queues, Realtime only if needed, Vault for scheduled-job secrets. Push: Expo Notifications/Expo Push Service. Email: Resend from Edge Functions as the practical transactional email default. AI: OpenAI SDK on Edge → official OpenAI (`gpt-4o-mini-transcribe` + `gpt-4o-mini`; adapters; see `DECISIONS.md`). Auth for private beta: email + password + 8-digit OTP.

Expo is not a backend. Keep secrets out of `EXPO_PUBLIC_*`. This pack is a plan, not deployed infrastructure. Verify current APIs, model names, quotas, prices, and SDK compatibility before shipping.
