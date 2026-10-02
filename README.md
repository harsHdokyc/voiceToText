# Voice-to-Work

Mobile-first app that turns voice notes into editable transcripts and **user-approved** tasks.

## Status
Phase 0–4 scaffold + hosted Supabase + email/password OTP auth + note processing. AI via **official OpenAI** (`gpt-4o-mini-transcribe` + `gpt-4o-mini`). See [docs/STATUS.md](./docs/STATUS.md) and [docs/DECISIONS.md](./docs/DECISIONS.md).

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
2. Set Edge secrets in Supabase Dashboard (never in Expo) — **replace any old Naga values**:
   - `OPENAI_API_KEY` = OpenAI secret key
   - `OPENAI_BASE_URL` = `https://api.openai.com/v1`
   - optional: `AI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe`, `AI_CHAT_MODEL=gpt-4o-mini`
3. `npm start` → sign in → invoke `health` / `openai-spike` (`config` then `chat`).

## Stack
Expo + React Native + TypeScript · Expo Router · TanStack Query · Supabase · OpenAI SDK on Edge (`gpt-4o-mini-transcribe` + `gpt-4o-mini`) · Expo Push / Resend later · auth: email/password + 8-digit OTP.

## Core product loop
Record → private upload → transcribe → extract candidate tasks → user reviews/approves → tasks + optional reminders.
