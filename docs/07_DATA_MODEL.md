# Data Model
Use UUID primary keys, UTC `timestamptz`, foreign keys, constraints, indexes, and migrations.

## profiles
`id` references `auth.users(id)` cascade; `display_name`, `timezone`, `locale`, `created_at`, `updated_at`.

## notes
`id`, `user_id`, `title`, `audio_path` (object path, not public URL), `audio_mime_type`, `audio_duration_seconds`, `transcript`, `edited_transcript`, `language`, `status`, `processing_attempts`, `last_error_code`, timestamps. Index `(user_id, created_at desc)` and `(user_id, status)`.

## task_suggestions
`id`, `user_id`, `note_id`, `title`, `details`, `kind`, `due_at`, `priority`, `source_quote`, `confidence`, `status` (`pending/approved/rejected`), `created_task_id`, timestamps. Index `(user_id, note_id)`.

## tasks
`id`, `user_id`, `source_note_id`, `source_suggestion_id`, `title`, `details`, `status` (`open/completed/archived`), `due_at`, `priority`, `completed_at`, timestamps. Unique partial index on non-null `source_suggestion_id` prevents duplicate approval. Index `(user_id, status, due_at)`.

## reminders
`id`, `user_id`, `task_id`, `scheduled_for`, `status` (`scheduled/claimed/sent/cancelled/failed`), unique `idempotency_key`, `attempt_count`, `last_error_code`, timestamps and `sent_at`. Index `(status, scheduled_for)`.

## device_tokens
`id`, `user_id`, unique `expo_push_token`, platform (`ios/android`), `last_seen_at`, `created_at`.

## notification_deliveries (optional)
`id`, `user_id`, `reminder_id`, channel (`push/email/in_app`), status, provider message ID, safe error code, timestamp. Decide uniqueness/retry semantics explicitly.

## RLS
Enable RLS on every exposed user-owned table. `user_id = auth.uid()` for each operation. Profile ID equals auth UID. Validate parent ownership on writes; task suggestions link to user's own note, reminders to user's own task. For suggestion approval, use a server function or transactional DB function so task creation and suggestion update are atomic. Test cross-user denial.
