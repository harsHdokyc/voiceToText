import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { edgeResult, invokeEdge } from '@/lib/invoke-edge';

const invoke = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: async () => invoke.result } },
}));

/** What @supabase/functions-js returns for a non-2xx response. */
function httpError(status: number, body: unknown) {
  return {
    data: null,
    error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      name: 'FunctionsHttpError',
      context: new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    }),
  };
}

describe('invokeEdge', () => {
  it('surfaces the function’s own code and reason from a 4xx response body', async () => {
    invoke.result = httpError(400, { ok: false, error: 'not_pending', reason: 'Suggestion already decided' });

    await expect(invokeEdge('approve-suggestion', 'approve_suggestion', { suggestionId: 's1' })).rejects.toMatchObject({
      code: 'not_pending',
      reason: 'Suggestion already decided',
    });
  });

  it('falls back to the prefixed code and transport message when the error body is not JSON', async () => {
    invoke.result = httpError(502, '<html>Bad gateway</html>');

    await expect(invokeEdge('delete-note', 'note_delete', { noteId: 'n1' })).rejects.toMatchObject({
      code: 'note_delete_failed',
      reason: 'Edge Function returned a non-2xx status code',
    });
  });

  it('returns the body on success', async () => {
    invoke.result = { data: { ok: true, suggestionId: 's1' }, error: null };

    await expect(invokeEdge('reject-suggestion', 'reject_suggestion')).resolves.toEqual({ ok: true, suggestionId: 's1' });
  });
});

function thrown(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected a throw');
}

describe('edgeResult', () => {
  it('returns the body when the function succeeded', () => {
    expect(edgeResult('delete-note', 'note_delete', { ok: true, noteId: 'n1' }, null)).toEqual({
      ok: true,
      noteId: 'n1',
    });
  });

  it('keeps the function’s own error code and reason on a transport error', () => {
    const e = thrown(() =>
      edgeResult('approve-suggestion', 'approve_suggestion', { ok: false, error: 'not_pending', reason: 'Suggestion already decided' }, { message: 'Edge Function returned a non-2xx status code' }),
    );
    expect(e).toBeInstanceOf(ApiError);
    expect([e.code, e.reason]).toEqual(['not_pending', 'Suggestion already decided']);
  });

  it('falls back to the prefixed code and transport message when the body is empty', () => {
    const e = thrown(() => edgeResult('process-note', 'process_note', null, { message: 'Failed to fetch' }));
    expect([e.code, e.reason]).toEqual(['process_note_failed', 'Failed to fetch']);
  });

  it('rejects an empty success body with the _empty code', () => {
    const e = thrown(() => edgeResult('reject-suggestion', 'reject_suggestion', null, null));
    expect([e.code, e.reason]).toEqual(['reject_suggestion_empty', 'reject-suggestion returned an empty body']);
  });

  it('treats ok:false as a failure, naming the function when no reason is given', () => {
    const e = thrown(() => edgeResult('extract-note', 'extract_retry', { ok: false, error: 'quota_exceeded' }, null));
    expect([e.code, e.reason]).toEqual(['quota_exceeded', 'extract-note failed: quota_exceeded']);
  });

  it('uses the prefixed code for a bare ok:false', () => {
    const e = thrown(() => edgeResult('delete-account', 'account_delete', { ok: false }, null));
    expect([e.code, e.reason]).toEqual(['account_delete_failed', 'delete-account returned ok:false']);
  });

  it('accepts bodies without an ok flag (developer probes)', () => {
    expect(edgeResult('health', 'dev_probe', { status: 'up' }, null)).toEqual({ status: 'up' });
  });
});
