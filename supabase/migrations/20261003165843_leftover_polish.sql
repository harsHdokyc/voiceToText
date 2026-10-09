-- Leftover polish: manual task create + reminder preference on profiles.

alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

create or replace function public.create_manual_task(
  p_title text,
  p_details text default null,
  p_due_at timestamptz default null,
  p_priority public.task_priority default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text;
  v_task public.tasks%rowtype;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_title := nullif(trim(p_title), '');
  if v_title is null then
    return json_build_object('ok', false, 'error', 'title_required');
  end if;

  insert into public.tasks (
    user_id,
    title,
    details,
    status,
    due_at,
    priority
  ) values (
    v_uid,
    v_title,
    nullif(trim(coalesce(p_details, '')), ''),
    'open',
    p_due_at,
    p_priority
  )
  returning * into v_task;

  return json_build_object(
    'ok', true,
    'task_id', v_task.id
  );
end;
$$;

revoke all on function public.create_manual_task(text, text, timestamptz, public.task_priority) from public;
revoke all on function public.create_manual_task(text, text, timestamptz, public.task_priority) from anon;
grant execute on function public.create_manual_task(text, text, timestamptz, public.task_priority) to authenticated;
