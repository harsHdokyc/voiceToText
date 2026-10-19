# Setup and Official Sources
## Environment
Client `.env` only (Expo app):
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Landing (`LandingPage/.env` locally; same names on **Vercel** project env — Root Directory `LandingPage`):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_URL=                      # optional; product/Expo web URL for Sign in
```

Edge / server secrets (Dashboard → Edge Functions → Secrets, or `supabase/functions/.env` locally):
```env
GOOGLE_API_KEY=                    # Gemini / Google AI Studio key (never commit)
AI_TRANSCRIPTION_MODEL=gemini-3.5-transcribe
AI_CHAT_MODEL=gemini-3.8-flash
# Later: RESEND_API_KEY, EXPO_ACCESS_TOKEN, APP_BASE_URL
```
Never prefix secrets with `EXPO_PUBLIC_` / never put `service_role` in Vite or Vercel. Don't commit filled `.env` files.

Marketing deploy status: [20_STATUS.md](./20_STATUS.md), [21_LANDING_ARCHITECTURE.md](./21_LANDING_ARCHITECTURE.md).

If older `OPENAI_*` / Naga secrets are still set on the project, **replace** them with `GOOGLE_API_KEY` — stale OpenAI env is unused by the new adapters. See `DECISIONS.md`.

## Official docs to verify
- Supabase Expo quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Expo guide to Supabase: https://docs.expo.dev/guides/using-supabase/
- Expo Router: https://docs.expo.dev/router/introduction/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Storage security: https://supabase.com/docs/guides/storage/security/access-control
- Private buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Cron: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase AI tools/Cursor: https://supabase.com/docs/guides/ai-tools
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- LangChain ChatGoogleGenerativeAI: https://docs.langchain.com/oss/javascript/integrations/chat/google_generative_ai
- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Gemini 3.5 Transcribe: https://ai.google.dev/gemini-api/docs/transcribe
- Gemini API key: https://ai.google.dev/gemini-api/docs/api-key
- Resend example: https://supabase.com/docs/guides/functions/examples/send-emails
- Edge Function limits (idle/wall clock): https://supabase.com/docs/guides/functions/limits

V1 locked choices live in `DECISIONS.md` — don’t re-open without new evidence.

## Competitors
https://voicenotes.com/ | https://audiopen.ai/ | https://otter.ai/ | https://fireflies.ai/ | https://www.granola.ai/ | https://www.notion.so/product/ai | https://todoist.com/

## Research limitations
Official docs support platform capability claims, not product-market fit. Competitor comparison is qualitative and not a verified exhaustive feature/pricing audit. Capture current prices and recent reviews in a dated follow-up audit. APIs, model names, SDK compatibility, quotas and prices change.
