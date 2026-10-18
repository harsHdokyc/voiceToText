import { describe, expect, it } from 'vitest';

import {
  isLiveDictationAvailable,
  transcriptFromSpeechResults,
} from '@/features/recording/services/live-dictation';

describe('transcriptFromSpeechResults', () => {
  it('concatenates transcripts in order', () => {
    expect(
      transcriptFromSpeechResults([
        { 0: { transcript: 'hello ' } },
        { 0: { transcript: 'world' } },
      ]),
    ).toBe('hello world');
  });

  it('skips missing alternatives', () => {
    expect(transcriptFromSpeechResults([{}, { 0: { transcript: 'ok' } }])).toBe(
      'ok',
    );
  });
});

describe('isLiveDictationAvailable', () => {
  it('is false in vitest (no SpeechRecognition)', () => {
    expect(isLiveDictationAvailable()).toBe(false);
  });
});
