# Notifications, Email, Cron
## Push
Use `expo-notifications` to request permissions and get Expo push tokens. Store multiple device tokens per user, refresh/remove stale tokens. Send from a trusted Edge Function; never put provider credentials in the app. Expo push response is not a guarantee that OS displayed a notification.

## Reminder dispatch
Persist UTC schedule. Cron runs at a justified cadence. Claim due reminders atomically to avoid duplicate workers. Send outside the transaction; record delivery attempt. Retry only transient failures with bounded retries. Recheck task status/preferences. Keep in-app reminders durable because push may be denied, delayed, or lost. Handle timezone/DST at input/display boundaries.

## Supabase Cron
Use `pg_cron`; if invoking Edge Functions, use `pg_net` and store secrets in Supabase Vault. Confirm extension availability, permissions, and current plan limits. Never hardcode secrets in migrations.

## Audio retention
`purge-note-audio` is invoked on a schedule with header `x-cron-secret: <CRON_SECRET>` (the same Edge secret as `dispatch-reminders`). Hourly is enough. Each run deletes up to 40 note files (any status, once the note is 3 days old) and up to 40 unreferenced objects older than 3 days. It is safe to run again. `pg_cron` is not installed on the hosted project; turn it on only as an ops step, or use Dashboard Cron. Do not put the secret in a migration.

Example after Vault has `project_url` and `cron_secret` (run in the SQL editor, not as a committed migration):

```sql
select cron.schedule(
  'purge-note-audio-hourly',
  '15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/purge-note-audio',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
```

## Email
Use Resend called from an Edge Function as the practical V1 default for transactional messages. Configure Supabase Auth email separately. Set SPF/DKIM/DMARC for a custom sender domain. Add bounce/delivery handling as needed; avoid sensitive transcript content in email. Don't assume Supabase Auth email is a full general-purpose email platform.
