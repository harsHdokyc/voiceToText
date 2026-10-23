-- "Today" follows each user's own clock, not UTC. profiles.timezone (IANA,
-- synced from the device) already exists; validate it and use it for the
-- daily AI cap so it resets at the user's local midnight. Missing → UTC.

create or replace function public.is_valid_timezone(p_tz text)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz)
$$;

revoke all on function public.is_valid_timezone(text) from public;
grant execute on function public.is_valid_timezone(text) to authenticated, service_role;

update public.profiles
set timezone = null
where timezone is not null and not public.is_valid_timezone(timezone);

alter table public.profiles
  add constraint profiles_timezone_valid
  check (timezone is null or public.is_valid_timezone(timezone));

create or replace function public.count_ai_usage_today(p_user_id uuid, p_kind text)
returns int
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_count int;
  v_tz text;
begin
  if coalesce(auth.role(), '') is distinct from 'service_role'
     and coalesce(current_setting('request.jwt.claim.role', true), '') is distinct from 'service_role'
     and p_user_id is distinct from auth.uid() then
    raise exception 'forbidden'
      using errcode = '42501';
  end if;

  select coalesce(p.timezone, 'UTC')
    into v_tz
  from public.profiles p
  where p.id = p_user_id;

  select count(*)::int
    into v_count
  from public.ai_usage_events e
  where e.user_id = p_user_id
    and e.kind = p_kind
    and e.created_at >= date_trunc('day', now(), coalesce(v_tz, 'UTC'));

  return v_count;
end;
$$;

comment on function public.count_ai_usage_today(uuid, text) is
  'Daily AI usage count since the user''s local midnight (profiles.timezone, else UTC). Authenticated callers may pass only auth.uid(); any other id raises 42501. service_role may pass any user id. Runs as the caller so RLS applies. Used by process-note for the 40/day cap.';

revoke all on function public.count_ai_usage_today(uuid, text) from public;
revoke all on function public.count_ai_usage_today(uuid, text) from anon;
grant execute on function public.count_ai_usage_today(uuid, text) to authenticated;
grant execute on function public.count_ai_usage_today(uuid, text) to service_role;
