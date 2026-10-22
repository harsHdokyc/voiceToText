/**
 * Runs count_ai_usage_today as authenticated and service_role.
 * The 20261022180000 definer exemption does not raise: the function owner
 * passes the check, so user A is told user B's count. This file fails if
 * that function is the one installed.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const db = `vtw_usage_${process.pid}`;
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

function psql(database: string, sql: string): string {
  return execFileSync(
    'sudo',
    [
      '-n',
      '-u',
      'postgres',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-d',
      database,
      '-At',
      '-q',
    ],
    { encoding: 'utf8', input: sql },
  )
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) ?? '';
}

function psqlFile(file: string) {
  execFileSync(
    'sudo',
    [
      '-n',
      '-u',
      'postgres',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-d',
      db,
      '-q',
      '-f',
      file,
    ],
    { encoding: 'utf8' },
  );
}

function asRole(dbRole: 'authenticated' | 'service_role', jwtRole: string, sub: string) {
  return psql(
    db,
    `
      select set_config('request.jwt.claim.sub', '${sub}', false);
      select set_config('request.jwt.claim.role', '${jwtRole}', false);
      set role ${dbRole};
      select public.try_count('${userA}'::uuid, 'process_note')
        || ',' || public.try_count('${userB}'::uuid, 'process_note')
        || ',' || public.try_count('${userA}'::uuid, 'transcribe');
    `,
  );
}

describe('count_ai_usage_today JWT role', () => {
  beforeAll(() => {
    psql('postgres', `drop database if exists ${db} with (force)`);
    psql('postgres', `create database ${db}`);
    psql(
      db,
      `
        create schema if not exists auth;
        create or replace function auth.uid()
        returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        create or replace function auth.role()
        returns text language sql stable as $$
          select coalesce(
            nullif(current_setting('request.jwt.claim.role', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
          )
        $$;
        do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
        do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
        do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
        alter role service_role bypassrls;
        alter role authenticated nobypassrls;
        grant usage on schema public, auth to anon, authenticated, service_role;

        create table public.ai_usage_events (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null,
          kind text not null,
          created_at timestamptz not null default now()
        );
        alter table public.ai_usage_events enable row level security;
        create policy ai_usage_events_select_own
          on public.ai_usage_events for select to authenticated
          using (user_id = auth.uid());
        grant select on table public.ai_usage_events to authenticated, service_role;

        insert into public.ai_usage_events (user_id, kind, created_at)
        select '${userA}'::uuid, 'process_note', now()
        from generate_series(1, 2)
        union all
        select '${userA}'::uuid, 'process_note',
          date_trunc('day', now() at time zone 'utc') - interval '1 second'
        union all
        select '${userA}'::uuid, 'extract', now()
        union all
        select '${userB}'::uuid, 'process_note', now()
        from generate_series(1, 4);

        create function public.try_count(p_user uuid, p_kind text)
        returns text language plpgsql as $$
        declare
          n int;
        begin
          n := public.count_ai_usage_today(p_user, p_kind);
          return 'count:' || n::text;
        exception
          when insufficient_privilege then
            return 'sqlstate:' || sqlstate;
          when others then
            return 'other:' || sqlstate || ':' || sqlerrm;
        end $$;
        grant execute on function public.try_count(uuid, text) to authenticated, service_role;
      `,
    );
  });

  afterAll(() => {
    psql('postgres', `drop database if exists ${db} with (force)`);
  });

  it('the applied definer function tells A that B has 4 notes today', () => {
    psqlFile(
      resolve(
        root,
        'supabase/migrations/20261022180000_count_ai_usage_ownership.sql',
      ),
    );
    expect(psql(db, `select prosecdef::text from pg_proc where proname = 'count_ai_usage_today'`)).toBe(
      'true',
    );
    expect(asRole('authenticated', 'authenticated', userA)).toBe(
      'count:2,count:4,count:0',
    );
  });

  it('raises 42501 when A asks for B and still returns A’s own daily count', () => {
    psqlFile(
      resolve(
        root,
        'supabase/migrations/20261022200000_count_ai_usage_invoker.sql',
      ),
    );
    expect(psql(db, `select prosecdef::text from pg_proc where proname = 'count_ai_usage_today'`)).toBe(
      'false',
    );
    expect(asRole('authenticated', 'authenticated', userA)).toBe(
      'count:2,sqlstate:42501,count:0',
    );
    expect(asRole('service_role', 'service_role', '')).toBe(
      'count:2,count:4,count:0',
    );
  });
});
