import { describe, expect, it } from 'vitest';

import { joinSpeechText } from '@/features/recording/services/speech-text';

describe('joinSpeechText', () => {
  it('appends a new phrase to earlier committed text with one space', () => {
    expect(joinSpeechText('buy milk', 'call mom')).toBe('buy milk call mom');
  });

  it('keeps typed text and does not add a leading space when it is empty', () => {
    expect(joinSpeechText('', 'call mom')).toBe('call mom');
  });

  it('drops blank interim segments instead of leaving trailing spaces', () => {
    expect(joinSpeechText('buy milk ', '   ')).toBe('buy milk');
  });

  it('trims padding the recognizer adds around phrases', () => {
    expect(joinSpeechText('  buy milk', ' call mom  ')).toBe('buy milk call mom');
  });
});
