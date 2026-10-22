import { describe, expect, it } from 'vitest';

import {
  attemptTimeoutMs,
  bytesToBase64,
  describeProcessError,
  failTargetForStage,
  isRetiredModelError,
  isRetryableHttpStatus,
  isRetryableUpstream,
  isStuckExtracting,
  messageContentToText,
  mimeTypeForAudioFile,
  parseModelJson,
  publicAiConfigView,
  sanitizeNoteTitle,
  STUCK_EXTRACTING_MS,
  uniqueChatModels,
  upstreamHttpStatus,
} from '@supabaseShared/ai/provider-utils';

describe('uniqueChatModels', () => {
  it('puts preferred first and dedupes fallbacks', () => {
    expect(
      uniqueChatModels('gemini-3.8-flash', [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
      ]),
    ).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash']);
  });
});

describe('publicAiConfigView', () => {
  it('exposes safe fields and key presence without the key', () => {
    expect(
      publicAiConfigView({
        providerLabel: 'gemini',
        transcriptionModel: 'gemini-3.5-transcribe',
        chatModel: 'gemini-3.8-flash',
        apiKey: 'secret',
      }),
    ).toEqual({
      provider: 'gemini',
      transcriptionModel: 'gemini-3.5-transcribe',
      chatModel: 'gemini-3.8-flash',
      apiKeyConfigured: true,
    });

    expect(
      publicAiConfigView({
        providerLabel: 'gemini',
        transcriptionModel: 'gemini-3.5-transcribe',
        chatModel: 'gemini-3.8-flash',
        apiKey: null,
      }).apiKeyConfigured,
    ).toBe(false);
  });
});

describe('isRetryableHttpStatus', () => {
  it('retries flaky/retired-model upstream statuses', () => {
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(404)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(undefined)).toBe(false);
  });
});

describe('isRetiredModelError', () => {
  it('detects 404 and Google retired-model message text', () => {
    expect(isRetiredModelError({ status: 404 })).toBe(true);
    expect(
      isRetiredModelError(
        new Error('This model models/gemini-2.5-flash is no longer available'),
      ),
    ).toBe(true);
    expect(isRetiredModelError(new Error('schema_validation_failed'))).toBe(
      false,
    );
  });
});

describe('upstreamHttpStatus', () => {
  it('reads status from nested SDK-shaped errors', () => {
    expect(upstreamHttpStatus({ status: 429 })).toBe(429);
    expect(upstreamHttpStatus({ statusCode: 503 })).toBe(503);
    expect(upstreamHttpStatus({ response: { status: 500 } })).toBe(500);
    expect(upstreamHttpStatus(new Error('nope'))).toBeUndefined();
  });
});

describe('failTargetForStage', () => {
  it('maps stage to the correct note failure status', () => {
    expect(failTargetForStage('transcribing')).toEqual({
      failStatus: 'transcription_failed',
      expectStatus: 'transcribing',
      fallbackCode: 'transcription_failed',
    });
    expect(failTargetForStage('extracting')).toEqual({
      failStatus: 'extraction_failed',
      expectStatus: 'extracting',
      fallbackCode: 'extraction_failed',
    });
  });
});

describe('describeProcessError', () => {
  it('uses upstream_unavailable for 503 provider errors instead of the message as code', () => {
    const err = Object.assign(
      new Error(
        '503 The upstream provider is temporarily unavailable. Please retry later.',
      ),
      { status: 503 },
    );
    expect(describeProcessError(err, 'extraction_failed')).toEqual({
      code: 'upstream_unavailable',
      reason:
        '503 The upstream provider is temporarily unavailable. Please retry later.',
    });
  });

  it('keeps prefixed machine codes from thrown Error messages', () => {
    expect(
      describeProcessError(
        new Error('audio_download_failed: object not found'),
        'transcription_failed',
      ),
    ).toEqual({
      code: 'audio_download_failed',
      reason: 'audio_download_failed: object not found',
    });
  });

  it('truncates long provider reasons to 300 chars', () => {
    const long = `x`.repeat(400);
    const err = Object.assign(new Error(`Gemini boom ${long}`), { status: 400 });
    const described = describeProcessError(err, 'extraction_failed');
    expect(described.code).toBe('upstream_400');
    expect(described.reason.length).toBe(300);
    expect(described.reason.startsWith('Gemini boom')).toBe(true);
  });
});

describe('isRetryableUpstream', () => {
  it('retries retired-model and 5xx, not schema failures', () => {
    expect(isRetryableUpstream({ status: 404 })).toBe(true);
    expect(isRetryableUpstream({ status: 503 })).toBe(true);
    expect(isRetryableUpstream(new Error('schema_validation_failed'))).toBe(
      false,
    );
  });

  it('retries a per-model timeout so the next fallback model gets a turn', () => {
    expect(isRetryableUpstream(new Error('upstream_timeout'))).toBe(true);
  });
});

describe('attemptTimeoutMs', () => {
  it('splits the remaining budget evenly across models left', () => {
    expect(attemptTimeoutMs(28000, 3)).toBe(9333);
    expect(attemptTimeoutMs(18000, 2)).toBe(9000);
    expect(attemptTimeoutMs(9000, 1)).toBe(9000);
  });

  it('returns 0 when the budget is spent or no models remain', () => {
    expect(attemptTimeoutMs(0, 2)).toBe(0);
    expect(attemptTimeoutMs(-50, 1)).toBe(0);
    expect(attemptTimeoutMs(5000, 0)).toBe(0);
  });
});

describe('mimeTypeForAudioFile', () => {
  it('prefers declared type and normalizes common aliases', () => {
    expect(mimeTypeForAudioFile({ type: 'audio/mp4', name: 'x.m4a' })).toBe(
      'audio/m4a',
    );
    expect(mimeTypeForAudioFile({ type: 'audio/mpeg', name: 'x.mp3' })).toBe(
      'audio/mp3',
    );
  });

  it('falls back to filename extension when type is missing', () => {
    expect(mimeTypeForAudioFile({ name: 'clip.wav' })).toBe('audio/wav');
    expect(mimeTypeForAudioFile({ name: 'clip.webm' })).toBe('audio/webm');
    expect(mimeTypeForAudioFile({ name: 'clip.bin' })).toBe('audio/mp3');
  });
});

describe('bytesToBase64', () => {
  it('encodes bytes to standard base64', () => {
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=');
  });
});

describe('messageContentToText', () => {
  it('keeps strings and joins multimodal text parts', () => {
    expect(messageContentToText('plain')).toBe('plain');
    expect(
      messageContentToText([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]),
    ).toBe('ab');
  });
});

describe('parseModelJson', () => {
  it('parses bare JSON and fenced JSON blocks', () => {
    expect(parseModelJson('{"tasks":[]}')).toEqual({ tasks: [] });
    expect(parseModelJson('```json\n{"tasks":[]}\n```')).toEqual({ tasks: [] });
  });

  it('throws on non-JSON', () => {
    expect(() => parseModelJson('not-json')).toThrow();
  });
});

describe('isStuckExtracting', () => {
  const now = Date.parse('2026-10-20T17:00:00.000Z');

  it('is true only for extracting older than the stale window', () => {
    const staleAt = new Date(now - STUCK_EXTRACTING_MS - 1).toISOString();
    expect(isStuckExtracting('extracting', staleAt, now)).toBe(true);
  });

  it('is false when still fresh, wrong status, or bad timestamp', () => {
    const freshAt = new Date(now - 30_000).toISOString();
    expect(isStuckExtracting('extracting', freshAt, now)).toBe(false);
    expect(isStuckExtracting('review_ready', freshAt, now)).toBe(false);
    expect(isStuckExtracting('extracting', 'not-a-date', now)).toBe(false);
    expect(isStuckExtracting(null, null, now)).toBe(false);
  });
});

describe('sanitizeNoteTitle', () => {
  it('trims, strips quotes/trailing punctuation, and falls back', () => {
    expect(sanitizeNoteTitle('  "Q3 pricing brainstorm."  ')).toBe(
      'Q3 pricing brainstorm',
    );
    expect(sanitizeNoteTitle('   ')).toBe('Voice note');
  });

  it('strips a trailing quote and punctuation in either order', () => {
    expect(sanitizeNoteTitle("'Call the landlord'.")).toBe('Call the landlord');
    expect(sanitizeNoteTitle('Ship it!"')).toBe('Ship it');
  });

  it('truncates long titles on a word boundary', () => {
    const long =
      'Alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike';
    const out = sanitizeNoteTitle(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith(' ')).toBe(false);
    expect(out).not.toContain('mike');
  });
});
