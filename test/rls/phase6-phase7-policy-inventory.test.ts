/**
 * Policy inventory — fails if Phase 6/7 migrations lose critical RLS / grant lines.
 * Complements manual SQL checklist in supabase/tests/rls_phase6_phase7.sql.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function migration(namePart: string) {
  const dir = resolve(root, 'supabase/migrations');
  const file = readdirSync(dir).find((f) => f.includes(namePart));
  if (!file) throw new Error(`Migration not found: ${namePart}`);
  return readFileSync(resolve(dir, file), 'utf8');
}

/** Latest `create or replace` body, grants included, later migrations win. */
function latestFunctionSql(functionName: string) {
  const dir = resolve(root, 'supabase/migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const marker = `create or replace function public.${functionName}`;
  let hit: { file: string; sql: string } | null = null;
  for (const file of files) {
    const sql = readFileSync(resolve(dir, file), 'utf8');
    const start = sql.lastIndexOf(marker);
    if (start < 0) continue;
    const rest = sql.slice(start);
    const next = rest.indexOf('\ncreate or replace function ', marker.length);
    hit = { file, sql: next === -1 ? rest : rest.slice(0, next) };
  }
  if (!hit) throw new Error(`Function not found: ${functionName}`);
  return hit;
}

describe('phase6 reminders migration RLS', () => {
  const sql = migration('phase6_reminders');

  it('enables RLS on reminders, device_tokens, deliveries', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('reminders_insert_own');
    expect(sql).toContain('device_tokens_insert_own');
    expect(sql).toContain('notification_deliveries_select_own');
  });

  it('keeps claim_due_reminders service_role-only', () => {
    expect(sql).toContain('claim_due_reminders');
    expect(sql).toContain(
      'grant execute on function public.claim_due_reminders(int) to service_role',
    );
    expect(sql).toContain(
      'revoke all on function public.claim_due_reminders(int) from authenticated',
    );
  });

  it('revokes client writes on notification_deliveries', () => {
    expect(sql).toContain(
      'revoke insert, update, delete on table public.notification_deliveries from authenticated',
    );
  });
});

describe('phase7 hardening migration', () => {
  const sql = migration('phase7_hardening');

  it('adds content-free ai_usage_events + daily counter', () => {
    expect(sql).toContain('ai_usage_events');
    expect(sql).toContain('count_ai_usage_today');
    expect(sql).not.toMatch(/transcript|prompt|audio_bytes/);
  });

  it('exposes delete_own_app_data to authenticated only', () => {
    expect(sql).toContain('delete_own_app_data');
    expect(sql).toContain(
      'grant execute on function public.delete_own_app_data() to authenticated',
    );
  });
});

describe('count_ai_usage_today ownership', () => {
  const defined = latestFunctionSql('count_ai_usage_today');

  it('is replaced after the applied retention migration', () => {
    expect(defined.file).toBe('20261022180000_count_ai_usage_ownership.sql');
    expect(defined.file > '20261022140000_audio_retention.sql').toBe(true);
  });

  it('returns another user’s count only for service_role', () => {
    expect(defined.sql).toContain('p_user_id is distinct from auth.uid()');
    expect(defined.sql).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(defined.sql).toContain("current_user not in ('service_role', 'postgres', 'supabase_admin')");
    expect(defined.sql).toContain("raise exception 'forbidden'");
    expect(defined.sql).toContain("errcode = '42501'");
  });

  it('keeps the UTC daily count the 40/day cap uses', () => {
    expect(defined.sql).toContain('from public.ai_usage_events e');
    expect(defined.sql).toContain('e.user_id = p_user_id');
    expect(defined.sql).toContain('e.kind = p_kind');
    expect(defined.sql).toContain(
      "e.created_at >= date_trunc('day', now() at time zone 'utc')",
    );
    expect(defined.sql).toContain('set search_path = public');
  });

  it('stays executable by the user JWT and not by anon', () => {
    expect(defined.sql).toContain(
      'revoke all on function public.count_ai_usage_today(uuid, text) from public',
    );
    expect(defined.sql).toContain(
      'revoke all on function public.count_ai_usage_today(uuid, text) from anon',
    );
    expect(defined.sql).toContain(
      'grant execute on function public.count_ai_usage_today(uuid, text) to authenticated',
    );
    expect(defined.sql).toContain(
      'grant execute on function public.count_ai_usage_today(uuid, text) to service_role',
    );
    expect(defined.sql).not.toContain(
      'grant execute on function public.count_ai_usage_today(uuid, text) to anon',
    );
  });

  it('process-note counts with the caller id on the user client', () => {
    const src = readFileSync(
      resolve(root, 'supabase/functions/process-note/index.ts'),
      'utf8',
    );
    expect(src).toContain('const DAILY_PROCESS_NOTE_LIMIT = 40');
    expect(src).toContain('ctx.supabase.rpc');
    expect(src).toContain('"count_ai_usage_today"');
    expect(src).toContain('p_user_id: userId');
  });
});

describe('security definer RPCs that already check auth.uid()', () => {
  it('approve_suggestion locks only the caller pending suggestion', () => {
    const { file, sql } = latestFunctionSql('approve_suggestion');
    expect(file).toBe('20261022100000_task_kind.sql');
    expect(sql).toContain('set search_path = public');
    expect(sql).toContain('and user_id = auth.uid()');
    expect(sql).toContain("and status = 'pending'");
    expect(sql).toContain('for update');
    expect(sql).toContain('from anon');
    expect(sql).toContain('to authenticated');
  });

  it('create_manual_task inserts a row only for auth.uid()', () => {
    const { file, sql } = latestFunctionSql('create_manual_task');
    expect(file).toBe('20261003165843_leftover_polish.sql');
    expect(sql).toContain('set search_path = public');
    expect(sql).toContain('v_uid uuid := auth.uid()');
    expect(sql).toContain('if v_uid is null then');
    expect(sql).toContain('v_uid,');
    expect(sql).toContain('from anon');
    expect(sql).toContain('to authenticated');
  });

  it('delete_own_app_data deletes only the caller rows', () => {
    const { file, sql } = latestFunctionSql('delete_own_app_data');
    expect(file).toBe('20261002184635_phase7_hardening.sql');
    expect(sql).toContain('set search_path = public');
    expect(sql).toContain('v_uid uuid := auth.uid()');
    expect(sql).toContain('if v_uid is null then');
    expect(sql).toContain('where user_id = v_uid');
    expect(sql).toContain('where id = v_uid');
    expect(sql).not.toContain('p_user_id');
    expect(sql).toContain(
      'grant execute on function public.delete_own_app_data() to authenticated',
    );
    expect(sql).toContain(
      'revoke all on function public.delete_own_app_data() from anon',
    );
  });
});
