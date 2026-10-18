-- Note categories for Workspace filter chips (Work | Ideas | Personal).
-- Default Ideas matches prototype capture default.

alter table public.notes
  add column if not exists category text not null default 'Ideas';

alter table public.notes
  drop constraint if exists notes_category_check;

alter table public.notes
  add constraint notes_category_check
  check (category in ('Work', 'Ideas', 'Personal'));

comment on column public.notes.category is 'Workspace filter: Work | Ideas | Personal';
