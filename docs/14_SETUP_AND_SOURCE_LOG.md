# Setup and Official Sources
## Environment
Client `.env` only:
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Edge / server secrets (Dashboard → Edge Functions → Secrets, or `supabase/functions/.env` locally):
```env
OPENAI_API_KEY=           # Naga API key for prototype (OpenAI SDK field name)
OPENAI_BASE_URL=https://api.naga.ac/v1
AI_TRANSCRIPTION_MODEL=whisper-large-v3:free
AI_CHAT_MODEL=llama-4-scout-17b-16e-instruct:free
# Later: RESEND_API_KEY, EXPO_ACCESS_TOKEN, APP_BASE_URL
```
Never prefix secrets with `EXPO_PUBLIC_`. Don't commit filled `.env` files.

See `DECISIONS.md` for why Naga is prototype-only and when to leave `:free`.

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
- OpenAI speech-to-text: https://platform.openai.com/docs/guides/speech-to-text
- Naga API overview: https://docs.naga.ac/api-reference/overview
- Naga Whisper free: https://naga.ac/models/whisper-large-v3%3Afree
- Naga STT: https://docs.naga.ac/api/audio/speech-to-text
- Naga privacy: https://docs.naga.ac/account/privacy-and-logging
- Naga rate limits: https://docs.naga.ac/build/rate-limits
- Resend example: https://supabase.com/docs/guides/functions/examples/send-emails
- Edge Function limits (idle/wall clock): https://supabase.com/docs/guides/functions/limits

V1 locked choices live in `DECISIONS.md` — don’t re-open without new evidence.

## Competitors
https://voicenotes.com/ | https://audiopen.ai/ | https://otter.ai/ | https://fireflies.ai/ | https://www.granola.ai/ | https://www.notion.so/product/ai | https://todoist.com/

## Research limitations
Official docs support platform capability claims, not product-market fit. Competitor comparison is qualitative and not a verified exhaustive feature/pricing audit. Capture current prices and recent reviews in a dated follow-up audit. APIs, model names, SDK compatibility, quotas and prices change.
