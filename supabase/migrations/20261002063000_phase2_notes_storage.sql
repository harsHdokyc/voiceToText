-- Phase 2: notes (+ tasks/suggestions schema for later slices) + private audio bucket.

create type public.note_status as enum (
  'draft',
  'uploading',
  'queued',
  'transcribing',
  'extracting',
  'review_ready',
  'upload_failed',
  'transcription_failed',
  'extraction_failed',
  'archived'
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  audio_path text,
  audio_mime_type text,
  audio_duration_seconds numeric(8, 2),
  transcript text,
  edited_transcript text,
  language text,
  status public.note_status not null default 'draft',
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_created_at_idx on public.notes (user_id, created_at desc);
create index notes_user_status_idx on public.notes (user_id, status);

alter table public.notes enable row level security;

create policy "notes_select_own"
  on public.notes for select to authenticated
  using (user_id = auth.uid());

create policy "notes_insert_own"
  on public.notes for insert to authenticated
  with check (user_id = auth.uid());

create policy "notes_update_own"
  on public.notes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_delete_own"
  on public.notes for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.notes from anon;
grant select, insert, update, delete on table public.notes to authenticated;

-- Suggestion + task tables (RLS ready; UI in later phases).
create type public.suggestion_status as enum ('pending', 'approved', 'rejected');
create type public.task_status as enum ('open', 'completed', 'archived');
create type public.suggestion_kind as enum ('task', 'reminder', 'idea', 'question', 'follow_up');
create type public.task_priority as enum ('low', 'normal', 'high');

create table public.task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  title text not null,
  details text,
  kind public.suggestion_kind not null default 'task',
  due_at timestamptz,
  priority public.task_priority,
  source_quote text not null,
  confidence text check (confidence in ('high', 'medium', 'low')),
  status public.suggestion_status not null default 'pending',
  created_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_suggestions_user_note_idx
  on public.task_suggestions (user_id, note_id);

alter table public.task_suggestions enable row level security;

create policy "task_suggestions_select_own"
  on public.task_suggestions for select to authenticated
  using (user_id = auth.uid());

create policy "task_suggestions_insert_own"
  on public.task_suggestions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy "task_suggestions_update_own"
  on public.task_suggestions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "task_suggestions_delete_own"
  on public.task_suggestions for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.task_suggestions from anon;
grant select, insert, update, delete on table public.task_suggestions to authenticated;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_note_id uuid references public.notes (id) on delete set null,
  source_suggestion_id uuid references public.task_suggestions (id) on delete set null,
  title text not null,
  details text,
  status public.task_status not null default 'open',
  due_at timestamptz,
  priority public.task_priority,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tasks_source_suggestion_unique
  on public.tasks (source_suggestion_id)
  where source_suggestion_id is not null;

create index tasks_user_status_due_idx
  on public.tasks (user_id, status, due_at);

alter table public.tasks enable row level security;

create policy "tasks_select_own"
  on public.tasks for select to authenticated
  using (user_id = auth.uid());

create policy "tasks_insert_own"
  on public.tasks for insert to authenticated
  with check (user_id = auth.uid());

create policy "tasks_update_own"
  on public.tasks for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tasks_delete_own"
  on public.tasks for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.tasks from anon;
grant select, insert, update, delete on table public.tasks to authenticated;

alter table public.task_suggestions
  add constraint task_suggestions_created_task_id_fkey
  foreign key (created_task_id) references public.tasks (id) on delete set null;

-- Private audio bucket. Path: {user_id}/{note_id}/original.*
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-audio',
  'note-audio',
  false,
  10485760,
  array[
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/aac',
    'audio/3gpp'
  ]::text[]
)
on conflict (id) do nothing;

create policy "note_audio_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'note-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "note_audio_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'note-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "note_audio_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'note-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'note-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "note_audio_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'note-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
