# Security and Privacy
1. Never ship service-role, OpenAI, Resend, or other secrets in Expo code or `EXPO_PUBLIC_*`.
2. Supabase URL and publishable key are public configuration; RLS is the boundary.
3. Enable RLS and explicit policies for every exposed user table.
4. Audio bucket is private. Persist object path, not public URL.
5. Signed URLs are bearer links until expiry; use short expiry and don't log/store them as permanent links.
6. Don't treat hard-to-guess paths as authorization.
7. Validate JWT, ownership, IDs, payloads, MIME, size, and duration at server boundaries.
8. Add quotas/rate limits for expensive AI endpoints.
9. Don't log raw audio, transcripts, prompts, auth headers, signed URLs, or secrets. Do log structured `[vtw]` lines with error **code** + **reason** (see [LOGGING_COMBINED.md](./LOGGING_COMBINED.md)).
10. Validate and bound model-generated text.
11. Define audio/transcript retention and account deletion before public launch.
12. Keep original transcript distinct from edited text.
13. No broad `true` policies for private content.
14. Keep service-role usage isolated to trusted server code; authorize first.
15. Commit migrations and review grants/RLS together.

Audio path pattern: `{user_id}/{note_id}/original.ext`. Storage policy validates bucket and path ownership; server checks object belongs to authenticated user and expected note. Use allowed MIME types/size limit. For deletion, coordinate DB and object cleanup with retries and orphan cleanup.

RLS checklist: grants correct? RLS enabled? policies per operation? insert `WITH CHECK`? update `USING` and `WITH CHECK`? Can `user_id` change? Can child reference another user's parent? Are policy columns indexed? Are cross-user tests present? Are views/functions safe?
