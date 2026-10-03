-- Phase 6: reminders, device tokens, notification delivery ledger.

create type public.reminder_status as enum (
  'scheduled',
  'claimed',
  'sent',
  'cancelled',
  'failed'
);

create type public.device_platform as enum ('ios', 'android', 'web');

create type public.delivery_channel as enum ('push', 'email', 'in_app');

create type public.delivery_status as enum (
  'attempted',
  'accepted',
  'failed',
  'skipped'
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform public.device_platform not null default 'ios',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint device_tokens_expo_push_token_key unique (expo_push_token)
);

create index device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own"
  on public.device_tokens for select to authenticated
  using (user_id = auth.uid());

create policy "device_tokens_insert_own"
  on public.device_tokens for insert to authenticated
  with check (user_id = auth.uid());

create policy "device_tokens_update_own"
  on public.device_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "device_tokens_delete_own"
  on public.device_tokens for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.device_tokens from anon;
grant select, insert, update, delete on table public.device_tokens to authenticated;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  scheduled_for timestamptz not null,
  status public.reminder_status not null default 'scheduled',
  idempotency_key text not null,
  attempt_count int not null default 0,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_idempotency_key_key unique (idempotency_key),
  constraint reminders_attempt_count_nonneg check (attempt_count >= 0)
);

create index reminders_status_scheduled_idx
  on public.reminders (status, scheduled_for);

create index reminders_user_task_idx
  on public.reminders (user_id, task_id);

alter table public.reminders enable row level security;

create policy "reminders_select_own"
  on public.reminders for select to authenticated
  using (user_id = auth.uid());

create policy "reminders_insert_own"
  on public.reminders for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.user_id = auth.uid()
        and t.status = 'open'
    )
  );

create policy "reminders_update_own"
  on public.reminders for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clients may cancel; claim/send is dispatcher (service role).
create policy "reminders_delete_own"
  on public.reminders for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.reminders from anon;
grant select, insert, update, delete on table public.reminders to authenticated;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  channel public.delivery_channel not null,
  status public.delivery_status not null,
  attempt_number int not null,
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  constraint notification_deliveries_attempt_uniq
    unique (reminder_id, channel, attempt_number)
);

create index notification_deliveries_reminder_idx
  on public.notification_deliveries (reminder_id);

alter table public.notification_deliveries enable row level security;

-- Deliveries are written by dispatcher (service role). Users may read own.
create policy "notification_deliveries_select_own"
  on public.notification_deliveries for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.notification_deliveries from anon;
revoke insert, update, delete on table public.notification_deliveries from authenticated;
grant select on table public.notification_deliveries to authenticated;

-- Atomic claim for due reminders (service role / security definer).
create or replace function public.claim_due_reminders(p_limit int default 20)
returns setof public.reminders
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    p_limit := 20;
  end if;

  return query
  with due as (
    select r.id
    from public.reminders r
    where r.status = 'scheduled'
      and r.scheduled_for <= now()
    order by r.scheduled_for asc
    limit p_limit
    for update skip locked
  ),
  stuck as (
    select r.id
    from public.reminders r
    where r.status = 'claimed'
      and r.updated_at < now() - interval '15 minutes'
      and r.attempt_count < 5
    order by r.updated_at asc
    limit greatest(p_limit / 2, 1)
    for update skip locked
  ),
  picked as (
    select id from due
    union all
    select id from stuck
  )
  update public.reminders r
  set status = 'claimed',
    attempt_count = r.attempt_count + 1,
    updated_at = now()
  from picked p
  where r.id = p.id
  returning r.*;
end;
$$;

revoke all on function public.claim_due_reminders(int) from public;
revoke all on function public.claim_due_reminders(int) from anon;
revoke all on function public.claim_due_reminders(int) from authenticated;
grant execute on function public.claim_due_reminders(int) to service_role;

comment on function public.claim_due_reminders(int) is
  'Phase 6: claim due/stuck reminders for dispatch-reminders Edge (service_role only).';
