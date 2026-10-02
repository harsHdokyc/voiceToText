# PRD
## Summary
Mobile-first app that turns voice notes into editable transcripts and user-approved tasks.

## Goals
- Reliable recording/upload on iOS and Android.
- Private audio storage and processing status.
- Readable transcript.
- Structured task suggestions with source evidence.
- User review/approval.
- Tasks, completion, basic search, reminders.
- Strong per-user data isolation and product analytics without content collection.

## Non-goals
Team workspaces, meeting bots, calendar bots, autonomous actions, complex projects/kanban, public sharing, custom model training, offline-first sync engine, multiple external task integrations, broad web dashboard.

## Functional requirements
### Auth
Email/password for private beta (see `DECISIONS.md`); persistent session, sign out, protected routes, account deletion designed before public launch. Passwordless/OAuth deferred until deep linking is intentional work.
### Capture
Start/stop recording; handle permissions; show duration; avoid duplicate submissions; upload to private Storage; enforce size/type/duration; allow retry.
### Notes
Title, original transcript, status, duration, language if available, timestamps, safe error code. Editable title and transcript. Newest-first list and basic search.
### AI extraction
Schema-validated suggestions with title, optional details, kind, source quote, optional due date only when supported by the transcript, optional priority only when clear. Empty list if no tasks. Suggestions are not active tasks until approved.
### Tasks
List, edit, complete/incomplete, delete/archive, link to source note, show source quote/context.
### Reminders
User-created reminder; UTC storage and local display; durable in-app state; best-effort push; user preferences.
### Privacy
Delete note/audio, sign out, explain external AI processing, data/account deletion path.

## Non-functional requirements
TypeScript strict mode; RLS for exposed user data; private audio bucket; no server secrets in client; validation at trust boundaries; idempotent processing and approval; clear error states; no raw transcripts/audio in analytics/logs; migrations committed; accessibility basics.

## Privacy-aware analytics
recording_started/completed, upload_succeeded/failed, transcription_succeeded/failed, extraction_succeeded/failed, suggestion_approved/rejected, task_completed, reminder_created, user_returned_7d. Never include transcript or audio content.

## Risks
Audio quality/accent mismatch, hallucinated tasks, latency/cost, mobile backgrounding, push delivery uncertainty, privacy concerns, scope creep.
