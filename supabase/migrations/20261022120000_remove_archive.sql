-- Remove archive: map existing archived rows, then drop 'archived' from both status enums.
-- Policies referencing the status columns must be dropped/recreated around the type swap.

update public.tasks set status = 'completed', updated_at = now() where status = 'archived';
update public.notes
set status = case when transcript is not null then 'review_ready' else 'draft' end::public.note_status,
    updated_at = now()
where status = 'archived';

drop policy if exists task_suggestions_insert_while_extracting on public.task_suggestions;
drop policy if exists reminders_insert_own on public.reminders;

alter type public.task_status rename to task_status_old;
create type public.task_status as enum ('open', 'completed');
alter table public.tasks alter column status drop default;
alter table public.tasks
  alter column status type public.task_status using status::text::public.task_status;
alter table public.tasks alter column status set default 'open';
drop type public.task_status_old;

alter type public.note_status rename to note_status_old;
create type public.note_status as enum (
  'draft',
  'uploading',
  'queued',
  'transcribing',
  'extracting',
  'review_ready',
  'upload_failed',
  'transcription_failed',
  'extraction_failed'
);
alter table public.notes alter column status drop default;
alter table public.notes
  alter column status type public.note_status using status::text::public.note_status;
alter table public.notes alter column status set default 'draft';
drop type public.note_status_old;

create policy task_suggestions_insert_while_extracting on public.task_suggestions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = task_suggestions.note_id
        and n.user_id = auth.uid()
        and n.status = 'extracting'
    )
  );

create policy reminders_insert_own on public.reminders
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = reminders.task_id
        and t.user_id = auth.uid()
        and t.status = 'open'
    )
  );
