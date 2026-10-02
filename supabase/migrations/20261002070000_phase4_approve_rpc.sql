-- Phase 4: RPC function for atomic suggestion approval + task creation.

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
begin
  -- Verify suggestion exists, is owned by caller, and is pending
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

  -- Apply edits if provided
  if p_edited_title is not null then
    v_suggestion.title := p_edited_title;
  end if;
  if p_edited_details is not null then
    v_suggestion.details := p_edited_details;
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

  -- Create task (unique constraint on source_suggestion_id prevents duplicates)
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

  -- Update suggestion status
  update public.task_suggestions
  set status = 'approved',
    created_task_id = v_new_task.id,
    updated_at = now()
  where id = p_suggestion_id;

  return json_build_object(
    'ok', true,
    'task_id', v_new_task.id,
    'suggestion_id', p_suggestion_id
  );
end;
$$;

grant execute on function public.approve_suggestion to authenticated;
