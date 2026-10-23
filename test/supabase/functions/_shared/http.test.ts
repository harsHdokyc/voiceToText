import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { edgeResult } from '@/lib/invoke-edge';
import { edgeRequest } from '@supabaseShared/http';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

function clock(...times: number[]) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)]!;
}

/** Feed an Edge fail response to the app's real envelope mapper. */
async function appErrorFor(res: Response): Promise<ApiError> {
  const body = await res.json();
  try {
    edgeResult('fn', 'fn', body, null);
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('edgeResult accepted an ok:false body');
}

describe('edgeRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the status and an envelope the app maps to ApiError(code, reason)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = edgeRequest('edge.test').fail(404, 'note_not_found', 'Note missing or not owned');

    expect(res.status).toBe(404);
    const appError = await appErrorFor(res);
    expect(appError.code).toBe('note_not_found');
    expect(appError.message).toBe('Note missing or not owned');
  });

  it('keeps extra body fields but never lets them override error/reason', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = edgeRequest('edge.test').fail(400, 'not_pending', 'Already decided', {}, {
      status: 'approved',
      error: 'spoofed',
    });

    expect(await res.json()).toEqual({
      ok: false,
      status: 'approved',
      error: 'not_pending',
      reason: 'Already decided',
    });
  });

  it('maps a thrown `machine_code: detail` to a 502 with that code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = edgeRequest('edge.test').failFrom(
      new Error('note_delete_failed: permission denied for table notes'),
      'delete_failed',
    );

    expect(res.status).toBe(502);
    const appError = await appErrorFor(res);
    expect(appError.code).toBe('note_delete_failed');
    expect(appError.message).toBe('note_delete_failed: permission denied for table notes');
  });

  it('uses the fallback code for a thrown error with no machine prefix', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = edgeRequest('edge.test').failFrom(new Error('socket hang up'), 'purge_failed');

    expect((await appErrorFor(res)).code).toBe('purge_failed');
  });

  it('logs the fail line with code, reason, fields, and elapsed ms — never extra body', () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    edgeRequest('edge.test', clock(1_000, 1_250)).fail(
      429,
      'rate_limited',
      'Daily limit reached',
      { noteId: 'n1', transcript: 'secret words' },
      { status: 'queued' },
    );

    const line = String(errorLog.mock.calls[0]?.[0]);
    expect(line.startsWith('[vtw]\n')).toBe(true);
    const logged = JSON.parse(line.slice('[vtw]\n'.length));
    expect(logged).toMatchObject({
      src: 'edge',
      level: 'error',
      scope: 'edge.test',
      event: 'fail',
      code: 'rate_limited',
      reason: 'Daily limit reached',
      noteId: 'n1',
      durationMs: 250,
    });
    expect(logged).not.toHaveProperty('transcript');
    expect(logged).not.toHaveProperty('status');
  });
});
