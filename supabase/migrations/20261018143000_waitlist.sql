-- Early-access waitlist for the marketing site (LandingPage).
-- Public can INSERT only; no public SELECT/UPDATE/DELETE (ops via service role / dashboard).

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint waitlist_email_len check (char_length(email) between 3 and 255),
  constraint waitlist_first_name_len check (
    first_name is null or char_length(first_name) <= 80
  )
);

create unique index waitlist_email_lower_uidx on public.waitlist (lower(email));
create index waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

create policy "waitlist_insert_public"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

revoke all on table public.waitlist from public;
revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;
