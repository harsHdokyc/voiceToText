# Coding Standards — Simple and Senior-Level
## Philosophy
Readable code beats clever code. Build the smallest design that meets current requirements and can evolve. Don't overengineer for hypothetical scale.

## TypeScript
Strict mode; avoid `any`; use `unknown` at untrusted boundaries and narrow it; generate Supabase DB types when practical; use discriminated unions for real state machines; don't use non-null assertions to silence unclear initialization.

## React / Expo
Use Expo Router. Keep route files thin and screens focused. Feature hooks/services own data access. TanStack Query owns remote state; don't mirror it into local/global state without reason. Avoid `useEffect` for derived values and event-triggered operations. Don't wrap every callback in `useCallback`. Handle loading/empty/error/success. Accessible labels/tap targets.

## TanStack Query
Centralize query keys by feature. Query functions must surface errors rather than return fake empty data. Don't retry auth/validation errors. Invalidate only affected keys after mutations. Don't maintain duplicate fetch state.

## Supabase
One initialized client. No secrets in client. RLS mandatory. Migrations small/repeatable. Direct CRUD via RLS where simple; Edge Functions for secrets, external APIs, quotas, privileged operations, and atomic workflows. Handle `{ error }` results explicitly. Avoid triggers unless transaction integrity clearly requires them.

## Edge Functions and AI
Validate method/auth/input/ownership/limits. Provider adapters for model APIs. Safe error codes. Bounded timeout/retry. Structured output + runtime Zod validation. Transcript is untrusted content. Never auto-approve tasks. Don't log content/secrets. Don't expose hidden model reasoning; store source quotes or concise rationale only.

## Abstraction discipline
Add a dependency only for a real need. Prefer a function over a class without lifecycle/coherent state. Extract helpers when it improves naming, reuse, testing, or separation—not merely to hit line counts. Avoid generic `BaseService`, repository factory, event bus, speculative microservices, and global store.

## Cursor change discipline
Inspect before editing. Small coherent diff. No unrelated rewrites. Migrations for schema. Run checks and report exact commands/results; never claim an unrun test passed.
