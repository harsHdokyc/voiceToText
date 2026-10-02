import { describe, expect, it } from 'vitest';

import {
    describeProcessError,
    failTargetForStage,
    isRetryableHttpStatus,
    providerLabelFromBaseUrl,
    publicAiConfigView,
    uniqueChatModels,
} from '@supabaseShared/ai/provider-utils';

describe('providerLabelFromBaseUrl', () => {
  it('detects naga and openai hosts', () => {
    expect(providerLabelFromBaseUrl('https://api.naga.ac/v1')).toBe('naga');
    expect(providerLabelFromBaseUrl('https://api.openai.com/v1')).toBe(
      'openai',
    );
  });

  it('falls back for unknown or invalid URLs', () => {
    expect(providerLabelFromBaseUrl('https://example.com/v1')).toBe(
      'openai-compatible',
    );
    expect(providerLabelFromBaseUrl('not-a-url')).toBe('openai-compatible');
  });
});

describe('uniqueChatModels', () => {
  it('puts preferred first and dedupes fallbacks', () => {
    expect(uniqueChatModels('scout', ['scout', 'mini', 'llama'])).toEqual([
      'scout',
      'mini',
      'llama',
    ]);
  });
});

describe('publicAiConfigView', () => {
  it('exposes safe fields and key presence without the key', () => {
    expect(
      publicAiConfigView({
        providerLabel: 'naga',
        baseUrl: 'https://api.naga.ac/v1',
        transcriptionModel: 'whisper',
        chatModel: 'scout',
        apiKey: 'secret',
      }),
    ).toEqual({
      provider: 'naga',
      baseUrl: 'https://api.naga.ac/v1',
      transcriptionModel: 'whisper',
      chatModel: 'scout',
      apiKeyConfigured: true,
    });

    expect(
      publicAiConfigView({
        providerLabel: 'naga',
        baseUrl: 'https://api.naga.ac/v1',
        transcriptionModel: 'whisper',
        chatModel: 'scout',
        apiKey: null,
      }).apiKeyConfigured,
    ).toBe(false);
  });
});

describe('isRetryableHttpStatus', () => {
  it('retries flaky upstream statuses only', () => {
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(undefined)).toBe(false);
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
});
