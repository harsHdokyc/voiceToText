import { describe, expect, it } from 'vitest';

import { ApiError, describeError, errorMessageForUi } from './api-error';
import { formatLogLine, sanitizeLogFields } from './logger';

describe('sanitizeLogFields', () => {
  it('strips secrets and content fields', () => {
    expect(
      sanitizeLogFields({
        noteId: 'n1',
        password: 'secret',
        transcript: 'hello',
        token: 'abc',
      }),
    ).toEqual({ noteId: 'n1' });
  });
});

describe('formatLogLine', () => {
  it('emits pretty-printed [vtw] JSON with line breaks', () => {
    const line = formatLogLine(
      'info',
      'api.notes.upload',
      { event: 'ok', noteId: 'n1', durationMs: 12 },
      () => '2026-10-02T00:00:00.000Z',
    );
    expect(line).toBe(
      [
        '[vtw]',
        '{',
        '  "ts": "2026-10-02T00:00:00.000Z",',
        '  "src": "app",',
        '  "level": "info",',
        '  "scope": "api.notes.upload",',
        '  "event": "ok",',
        '  "noteId": "n1",',
        '  "durationMs": 12',
        '}',
      ].join('\n'),
    );
  });
});

describe('describeError', () => {
  it('reads ApiError code and reason', () => {
    expect(describeError(new ApiError('audio_missing', 'No audio on note'))).toEqual({
      code: 'audio_missing',
      reason: 'No audio on note',
    });
  });

  it('reads Supabase-style code + message (+ details)', () => {
    expect(
      describeError({
        code: '23505',
        message: 'duplicate key',
        details: 'Key (id)=(...) already exists.',
      }),
    ).toEqual({
      code: '23505',
      reason: 'duplicate key (Key (id)=(...) already exists.)',
    });
  });

  it('falls back for bare Error', () => {
    expect(describeError(new Error('boom'))).toEqual({
      code: 'error',
      reason: 'boom',
    });
  });
});

describe('errorMessageForUi', () => {
  it('surfaces the real reason, not a generic blob', () => {
    expect(
      errorMessageForUi(new ApiError('claim_lost', 'Another worker claimed the note')),
    ).toBe('Another worker claimed the note');
  });
});
