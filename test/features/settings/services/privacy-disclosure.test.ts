import { describe, expect, it } from 'vitest';
import {
  PRIVACY_DISCLOSURE,
  privacyDisclosureParagraphs,
} from '@/features/settings/services/privacy-disclosure';

describe('privacyDisclosureParagraphs', () => {
  it('splits disclosure into non-empty paragraphs', () => {
    const parts = privacyDisclosureParagraphs();
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.every((p) => p.length > 20)).toBe(true);
  });

  it('mentions private storage and human approval', () => {
    expect(PRIVACY_DISCLOSURE.toLowerCase()).toContain('private');
    expect(PRIVACY_DISCLOSURE.toLowerCase()).toContain('approve');
  });
});
