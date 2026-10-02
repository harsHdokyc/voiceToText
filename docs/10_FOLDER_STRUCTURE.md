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
│       ├── _shared/{auth.ts,cors.ts,errors.ts,validation.ts}
│       ├── _shared/ai/{transcription-provider.ts,task-extraction-provider.ts}
│       ├── process-note/index.ts
│       ├── approve-suggestion/index.ts
│       ├── register-push-token/index.ts
│       ├── dispatch-reminders/index.ts
│       └── delete-note/index.ts
├── docs/                        # product + engineering blueprint (lowercase)
│   ├── STATUS.md                # living: current phase / next slice / blockers
│   ├── DECISIONS.md             # living: material choices and open spikes
│   └── …numbered pack docs…
├── assets/
├── .cursor/rules/               # single source of Cursor agent rules (repo root)
├── .env.example
└── README.md
```
Route files compose screens, not contain business logic. Feature services own data access. `src/lib` is infrastructure config, not a dumping ground. `_shared` contains genuinely shared server code. Don't create a monorepo, generic repository factory, DI framework, or deep nesting until needed. Do not nest a second `.cursor/` under `docs/`.
