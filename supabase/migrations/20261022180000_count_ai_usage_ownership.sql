-- count_ai_usage_today is security definer and was executable by every
-- authenticated user with no check that p_user_id is the caller.
-- process-note calls it with the user JWT (not the service role) and passes
-- that user's id, so authenticated keeps execute. Other users' counts raise.
-- service_role may still count any user.

create or replace function public.count_ai_usage_today(p_user_id uuid, p_kind text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_user_id is distinct from auth.uid()
     and current_user not in ('service_role', 'postgres', 'supabase_admin')
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
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
  'Daily AI usage count for the caller. Authenticated callers may pass only their own user id. service_role may pass any user id. Used by process-note for the 40/day cap.';

revoke all on function public.count_ai_usage_today(uuid, text) from public;
revoke all on function public.count_ai_usage_today(uuid, text) from anon;
grant execute on function public.count_ai_usage_today(uuid, text) to authenticated;
grant execute on function public.count_ai_usage_today(uuid, text) to service_role;
