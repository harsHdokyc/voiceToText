-- Voice-note audio retention. Deletes nothing by itself.
-- purge-note-audio (service role) removes bucket objects, then sets these columns.
-- pg_cron is intentionally not enabled here: the hosted project does not have it,
-- and a failed CREATE EXTENSION would block this column. Schedule is an ops step.

alter table public.notes
  add column audio_purged_at timestamptz;

comment on column public.notes.audio_purged_at is
  'When the private note-audio object was removed after the retention window. Null means the file was not purged. The note, transcript, suggestions, tasks, and reminders stay.';

create index notes_audio_retention_idx
  on public.notes (created_at)
  where audio_path is not null and audio_purged_at is null;

-- Clients may update their notes, but only the service role may stamp retention.
create or replace function public.notes_guard_audio_purged_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role'
     or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.audio_purged_at is not null then
      raise exception 'audio_purged_at is server-managed'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.audio_purged_at is distinct from old.audio_purged_at then
    raise exception 'audio_purged_at is server-managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger notes_guard_audio_purged_at
  before insert or update on public.notes
  for each row
  execute function public.notes_guard_audio_purged_at();

revoke all on function public.notes_guard_audio_purged_at() from public;
revoke all on function public.notes_guard_audio_purged_at() from anon;
grant execute on function public.notes_guard_audio_purged_at() to authenticated;
grant execute on function public.notes_guard_audio_purged_at() to service_role;
