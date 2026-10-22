-- Follow-up to 20261022140000_audio_retention (already applied; do not edit it).
-- The 3-day window is the retry window for every note status, with or without
-- a transcript. notes_audio_retention_idx already matches
-- (audio_path is not null and audio_purged_at is null), so it is left in place.
--
-- Orphan lookup only. Deletes still go through the Storage API in purge-note-audio.
-- Do not DELETE FROM storage.objects.

create or replace function public.list_orphan_note_audio(
  p_cutoff timestamptz,
  p_limit integer
)
returns table (
  object_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, storage
as $$
  select o.name, o.created_at, o.updated_at
  from storage.objects o
  where o.bucket_id = 'note-audio'
    and o.created_at <= p_cutoff
    and o.updated_at <= p_cutoff
    and o.name <> ''
    and right(o.name, 1) <> '/'
    and not exists (
      select 1
      from public.notes n
      where n.audio_path = o.name
    )
  order by o.created_at asc
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

comment on function public.list_orphan_note_audio(timestamptz, integer) is
  'Service-role list of note-audio objects older than the cutoff that no note still references. Callers delete them with the Storage API.';

revoke all on function public.list_orphan_note_audio(timestamptz, integer) from public;
revoke all on function public.list_orphan_note_audio(timestamptz, integer) from anon;
revoke all on function public.list_orphan_note_audio(timestamptz, integer) from authenticated;
grant execute on function public.list_orphan_note_audio(timestamptz, integer) to service_role;
