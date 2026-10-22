-- Phase 7 RLS smoke expectations (run manually against local/hosted with two test users).
-- Not executed by Vitest. Documents allow/deny cases required by docs/12_TESTING_STRATEGY.md.

-- Setup (service role):
--   create users A and B via Auth; insert note/task owned by A.

-- Anon must not see tasks/reminders/device_tokens/notes:
--   set role anon; select count(*) from public.tasks; -- expect 0 / permission denied

-- User A selects own task: ok
-- User A selects B's task: 0 rows
-- User A inserts reminder for B's task: fail (WITH CHECK)
-- User A cannot insert notification_deliveries: fail
-- User A cannot execute claim_due_reminders: fail
-- service_role can execute claim_due_reminders: ok

-- User A count_ai_usage_today(A, 'process_note'): own count (process-note cap)
-- User A count_ai_usage_today(B, 'process_note'): error 42501 forbidden, not B's count
-- service_role count_ai_usage_today(B, 'process_note'): B's count
-- anon count_ai_usage_today: permission denied

-- Cross-check indexes exist for policy columns:
select indexname from pg_indexes
where schemaname = 'public'
  and tablename in ('reminders', 'device_tokens', 'notification_deliveries', 'ai_usage_events');
