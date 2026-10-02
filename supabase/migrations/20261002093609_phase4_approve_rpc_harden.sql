-- Harden approve_suggestion: validate edited title; revoke anon/public execute.

create or replace function public.approve_suggestion(
  p_suggestion_id uuid,
  p_edited_title text default null,
  p_edited_details text default null,
  p_edited_kind public.suggestion_kind default null,
  p_edited_due_at timestamptz default null,
  p_edited_priority public.task_priority default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suggestion public.task_suggestions%rowtype;
  v_new_task public.tasks%rowtype;
  v_title text;
begin
  select * into v_suggestion
  from public.task_suggestions
  where id = p_suggestion_id
    and user_id = auth.uid()
    and status = 'pending'
  for update;

  if not found then
    return json_build_object(
      'ok', false,
      'error', 'suggestion_not_found_or_not_pending'
    );
  end if;

  if p_edited_title is not null then
    v_title := nullif(trim(p_edited_title), '');
    if v_title is null then
      return json_build_object('ok', false, 'error', 'title_required');
    end if;
    v_suggestion.title := v_title;
  end if;
  if p_edited_details is not null then
    v_suggestion.details := nullif(trim(p_edited_details), '');
  end if;
  if p_edited_kind is not null then
    v_suggestion.kind := p_edited_kind;
  end if;
  if p_edited_due_at is not null then
    v_suggestion.due_at := p_edited_due_at;
  end if;
  if p_edited_priority is not null then
    v_suggestion.priority := p_edited_priority;
  end if;

  insert into public.tasks (
    user_id,
    source_note_id,
    source_suggestion_id,
    title,
    details,
    status,
    due_at,
    priority
  ) values (
    v_suggestion.user_id,
    v_suggestion.note_id,
    v_suggestion.id,
    v_suggestion.title,
    v_suggestion.details,
    'open',
    v_suggestion.due_at,
    v_suggestion.priority
  )
  returning * into v_new_task;

  update public.task_suggestions
  set status = 'approved',
    created_task_id = v_new_task.id,
    title = v_suggestion.title,
    details = v_suggestion.details,
    kind = v_suggestion.kind,
    due_at = v_suggestion.due_at,
    priority = v_suggestion.priority,
    updated_at = now()
  where id = p_suggestion_id;

  return json_build_object(
    'ok', true,
    'task_id', v_new_task.id,
    'suggestion_id', p_suggestion_id
  );
end;
$$;

revoke all on function public.approve_suggestion(
  uuid, text, text, public.suggestion_kind, timestamptz, public.task_priority
) from public;
revoke all on function public.approve_suggestion(
  uuid, text, text, public.suggestion_kind, timestamptz, public.task_priority
) from anon;
grant execute on function public.approve_suggestion(
  uuid, text, text, public.suggestion_kind, timestamptz, public.task_priority
) to authenticated;
