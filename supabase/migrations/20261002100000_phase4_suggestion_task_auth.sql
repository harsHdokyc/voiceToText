-- Phase 4 auth boundary: suggestions stay drafts until approve RPC creates the task.
-- - Clients may only reject pending suggestions (status pending -> rejected).
-- - Approve RPC (security definer) still updates to approved + creates the task.
-- - Clients may not insert tasks (would bypass approve); RPC inserts instead.
-- - Suggestion inserts only while the note is extracting (process-note path).
-- - process-note still deletes pending suggestions via the user JWT.

drop policy if exists "task_suggestions_update_own" on public.task_suggestions;

create policy "task_suggestions_reject_own"
  on public.task_suggestions for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'rejected');

drop policy if exists "task_suggestions_insert_own" on public.task_suggestions;

create policy "task_suggestions_insert_while_extracting"
  on public.task_suggestions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_id
        and n.user_id = auth.uid()
        and n.status = 'extracting'
    )
  );

drop policy if exists "tasks_insert_own" on public.tasks;

revoke insert on table public.tasks from authenticated;
-- select/update/delete remain for Phase 5 task management over approved tasks.
