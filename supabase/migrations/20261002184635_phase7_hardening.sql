-- Phase 7: usage metrics, rate-limit helper, account wipe RPC.

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('transcribe', 'extract', 'process_note')),
  model text,
  provider text,
  duration_ms int,
  audio_seconds numeric,
  suggestion_count int,
  created_at timestamptz not null default now()
);

create index ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

-- No content columns. Users may insert own usage rows (Edge process-note); select own.
create policy "ai_usage_events_select_own"
  on public.ai_usage_events for select to authenticated
  using (user_id = auth.uid());

create policy "ai_usage_events_insert_own"
  on public.ai_usage_events for insert to authenticated
  with check (user_id = auth.uid());

revoke all on table public.ai_usage_events from anon;
revoke update, delete on table public.ai_usage_events from authenticated;
grant select, insert on table public.ai_usage_events to authenticated;

-- Daily process-note cap (content-free quota).
create or replace function public.count_ai_usage_today(p_user_id uuid, p_kind text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.ai_usage_events e
  where e.user_id = p_user_id
    and e.kind = p_kind
    and e.created_at >= date_trunc('day', now() at time zone 'utc');
$$;

revoke all on function public.count_ai_usage_today(uuid, text) from public;
revoke all on function public.count_ai_usage_today(uuid, text) from anon;
grant execute on function public.count_ai_usage_today(uuid, text) to authenticated;
grant execute on function public.count_ai_usage_today(uuid, text) to service_role;

-- Wipe user-owned app data (audio cleanup is Edge's job before calling this).
create or replace function public.delete_own_app_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_notes int;
  v_tasks int;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  delete from public.notification_deliveries where user_id = v_uid;
  delete from public.reminders where user_id = v_uid;
  delete from public.device_tokens where user_id = v_uid;
  delete from public.ai_usage_events where user_id = v_uid;

  delete from public.tasks where user_id = v_uid;
  get diagnostics v_tasks = row_count;

  delete from public.task_suggestions where user_id = v_uid;
  delete from public.notes where user_id = v_uid;
  get diagnostics v_notes = row_count;

  delete from public.profiles where id = v_uid;

  return json_build_object(
    'ok', true,
    'notes_deleted', v_notes,
    'tasks_deleted', v_tasks
  );
end;
$$;

revoke all on function public.delete_own_app_data() from public;
revoke all on function public.delete_own_app_data() from anon;
grant execute on function public.delete_own_app_data() to authenticated;
