-- Replaces 20261022180000_count_ai_usage_ownership, which is already applied
-- and does not raise. That function is security definer, so the session role
-- seen inside it is the owner. The owner was on the exemption list, the check
-- never ran, and user A received user B's count (0 when B had no rows today).
--
-- This function runs as the caller. ai_usage_events_select_own still limits
-- authenticated reads to auth.uid(). process-note calls with the user JWT and
-- that same id, so the 40/day cap still sees the caller's rows. service_role
-- bypasses RLS and may count any user. The guard reads the JWT, not the owner.

create or replace function public.count_ai_usage_today(p_user_id uuid, p_kind text)
returns int
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  if coalesce(auth.role(), '') is distinct from 'service_role'
     and coalesce(current_setting('request.jwt.claim.role', true), '') is distinct from 'service_role'
     and p_user_id is distinct from auth.uid() then
    raise exception 'forbidden'
      using errcode = '42501';
  end if;

  select count(*)::int
    into v_count
  from public.ai_usage_events e
  where e.user_id = p_user_id
    and e.kind = p_kind
    and e.created_at >= date_trunc('day', now() at time zone 'utc');

  return v_count;
end;
$$;

comment on function public.count_ai_usage_today(uuid, text) is
  'Daily AI usage count. Authenticated callers may pass only auth.uid(); any other id raises 42501. service_role may pass any user id. Runs as the caller so ai_usage_events RLS applies. Used by process-note for the 40/day cap.';

revoke all on function public.count_ai_usage_today(uuid, text) from public;
revoke all on function public.count_ai_usage_today(uuid, text) from anon;
grant execute on function public.count_ai_usage_today(uuid, text) to authenticated;
grant execute on function public.count_ai_usage_today(uuid, text) to service_role;
