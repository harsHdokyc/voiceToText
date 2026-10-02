# Voice-to-Work

Mobile-first app that turns voice notes into editable transcripts and **user-approved** tasks.

## Status
Phase 0–1 scaffold + hosted Supabase + email/password OTP auth. Prototype AI via **Naga** (OpenAI-compatible SDK). See [docs/STATUS.md](./docs/STATUS.md) and [docs/DECISIONS.md](./docs/DECISIONS.md).

## Quick links
| What | Where |
|---|---|
| Current status | [docs/STATUS.md](./docs/STATUS.md) |
| Decision log | [docs/DECISIONS.md](./docs/DECISIONS.md) |
| AI pipeline | [docs/06_AI_PIPELINE.md](./docs/06_AI_PIPELINE.md) |
| Setup / secrets | [docs/14_SETUP_AND_SOURCE_LOG.md](./docs/14_SETUP_AND_SOURCE_LOG.md) |
| Docs map | [docs/README.md](./docs/README.md) |
| Cursor rules | [.cursor/rules/](./.cursor/rules/) |
| Client env template | [.env.example](./.env.example) |
| Edge AI env template | [supabase/functions/.env.example](./supabase/functions/.env.example) |

## Hosted app setup
1. Client `.env` already points at the hosted project (see `.env.example`).
2. Set Edge secrets in Supabase Dashboard (never in Expo):
   - `OPENAI_API_KEY` = Naga API key
   - `OPENAI_BASE_URL` = `https://api.naga.ac/v1`
   - optional model overrides (defaults documented in DECISIONS)
3. `npm start` → sign in → invoke `health` / `openai-spike`.

## Stack
Expo + React Native + TypeScript · Expo Router · TanStack Query · Supabase · OpenAI SDK on Edge pointed at Naga for prototype STT (`whisper-large-v3:free`) + chat extraction · Expo Push / Resend later · auth: email/password + 8-digit OTP.

## Core product loop
Record → private upload → transcribe → extract candidate tasks → user reviews/approves → tasks + optional reminders.
