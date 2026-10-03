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
