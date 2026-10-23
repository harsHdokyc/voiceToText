import { describe, expect, it } from 'vitest';

import { applySpeechResult, joinSpeechText } from '@/features/recording/services/speech-text';

/** Feed a recognizer event sequence through the rule, like the native listener does. */
function dictate(base: string, events: [text: string, isFinal: boolean][]) {
  let committed = base;
  let display = base;
  for (const [text, isFinal] of events) {
    ({ committed, display } = applySpeechResult(committed, text, isFinal));
  }
  return { committed, display };
}

describe('applySpeechResult', () => {
  it('Android: one final per phrase accumulates phrases after the typed text', () => {
    expect(
      dictate('Note:', [
        ['buy', false],
        ['buy milk', false],
        ['buy milk', true],
        ['call', false],
        ['call Sam', true],
      ]),
    ).toEqual({ committed: 'Note: buy milk call Sam', display: 'Note: buy milk call Sam' });
  });

  it('iOS: a growing transcript is previewed, then committed once without duplication', () => {
    expect(
      dictate('', [
        ['buy', false],
        ['buy milk', false],
        ['buy milk call Sam', false],
        ['buy milk call Sam', true],
      ]),
    ).toEqual({ committed: 'buy milk call Sam', display: 'buy milk call Sam' });
  });

  it('an interim result previews without committing', () => {
    expect(applySpeechResult('buy milk', 'call', false)).toEqual({
      committed: 'buy milk',
      display: 'buy milk call',
    });
  });
});

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
