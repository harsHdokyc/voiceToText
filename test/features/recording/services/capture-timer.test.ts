import { describe, expect, it } from 'vitest';

import { formatCaptureTimer } from '@/features/recording/services/capture-timer';

describe('formatCaptureTimer', () => {
  it('formats zero and under a minute', () => {
    expect(formatCaptureTimer(0)).toBe('0:00');
    expect(formatCaptureTimer(5)).toBe('0:05');
    expect(formatCaptureTimer(59)).toBe('0:59');
  });

  it('formats minutes with padded seconds', () => {
    expect(formatCaptureTimer(60)).toBe('1:00');
    expect(formatCaptureTimer(75)).toBe('1:15');
    expect(formatCaptureTimer(600)).toBe('10:00');
  });

  it('floors fractional and clamps negatives', () => {
    expect(formatCaptureTimer(1.9)).toBe('0:01');
    expect(formatCaptureTimer(-3)).toBe('0:00');
  });
});
