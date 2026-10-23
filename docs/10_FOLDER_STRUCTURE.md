# Folder Structure
```text
voice-to-work/
├── app/                         # Expo Router route files only
│   ├── _layout.tsx
│   ├── (auth)/sign-in.tsx
│   └── (app)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── record.tsx
│       ├── notes/index.tsx
│       ├── notes/[noteId].tsx
│       ├── tasks/index.tsx
│       └── settings.tsx
├── src/
│   ├── components/ui/
│   ├── features/
│   │   ├── auth/{components,hooks,services}/
│   │   ├── recording/{components,hooks,services}/
│   │   ├── notes/{components,hooks,services}/
│   │   ├── tasks/{components,hooks,services}/
│   │   ├── reminders/
│   │   └── settings/
│   ├── lib/{supabase.ts,query-client.ts,env.ts,logger.ts}
│   ├── providers/
│   ├── theme/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── tests/database/
│   └── functions/
│       ├── _shared/{http.ts,log.ts,service-role.ts}
│       ├── _shared/notes/note-lifecycle.ts
│       ├── _shared/ai/{config,provider-utils,transcription-provider,task-extraction-provider,…}.ts
│       ├── _shared/storage/{note-audio-path,audio-retention}.ts
│       ├── _shared/reminders/constants.ts
│       ├── note-audio/ process-note/ extract-note/
│       ├── approve-suggestion/ reject-suggestion/
│       ├── register-push-token/ dispatch-reminders/ purge-note-audio/
│       ├── delete-note/ delete-account/
│       └── health/ openai-spike/      # debug; spike gated by ENABLE_DEBUG_FUNCTIONS
├── test/                        # Vitest; mirrors src/ and supabase/functions/_shared/
├── docs/                        # product + engineering blueprint (lowercase)
│   ├── 20_STATUS.md                # living: current phase / next slice / blockers
│   ├── 17_DECISIONS.md             # living: material choices and open spikes
│   ├── 25_GLOSSARY.md           # living: domain + architecture terms
│   └── …numbered pack docs…
├── assets/
├── .cursor/rules/               # single source of Cursor agent rules (repo root)
├── LandingPage/                 # marketing site (Vite) + Dockerfile + .dockerignore
├── Dockerfile                   # portal web build (Expo export → nginx)
├── docker-compose.yaml          # portal :3000 + landing :8080
├── .dockerignore                # keeps .env*, node_modules, docs, supabase out of the image
├── .env.example
└── README.md
```
Route files compose screens, not contain business logic. Feature services own data access. `src/lib` is infrastructure config, not a dumping ground. `_shared` contains genuinely shared server code. Don't create a monorepo, generic repository factory, DI framework, or deep nesting until needed. Do not nest a second `.cursor/` under `docs/`.
