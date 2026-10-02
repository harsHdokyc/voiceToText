import { describe, expect, it } from 'vitest';

import {
  providerLabelFromBaseUrl,
  publicAiConfigView,
  uniqueChatModels,
} from './provider-utils';

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
