# Notifications, Email, Cron
## Push
Use `expo-notifications` to request permissions and get Expo push tokens. Store multiple device tokens per user, refresh/remove stale tokens. Send from a trusted Edge Function; never put provider credentials in the app. Expo push response is not a guarantee that OS displayed a notification.

## Reminder dispatch
Persist UTC schedule. Cron runs at a justified cadence. Claim due reminders atomically to avoid duplicate workers. Send outside the transaction; record delivery attempt. Retry only transient failures with bounded retries. Recheck task status/preferences. Keep in-app reminders durable because push may be denied, delayed, or lost. Handle timezone/DST at input/display boundaries.

## Supabase Cron
Use `pg_cron`; if invoking Edge Functions, use `pg_net` and store secrets in Supabase Vault. Confirm extension availability, permissions, and current plan limits. Never hardcode secrets in migrations.

## Email
Use Resend called from an Edge Function as the practical V1 default for transactional messages. Configure Supabase Auth email separately. Set SPF/DKIM/DMARC for a custom sender domain. Add bounce/delivery handling as needed; avoid sensitive transcript content in email. Don't assume Supabase Auth email is a full general-purpose email platform.
