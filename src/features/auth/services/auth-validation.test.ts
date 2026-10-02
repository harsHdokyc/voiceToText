import { describe, expect, it } from 'vitest';

import {
  assertEmail,
  assertOtp,
  assertPassword,
  assertPasswordsMatch,
  authErrorMessage,
  normalizeEmail,
} from './auth-validation';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ada@Example.com ')).toBe('ada@example.com');
  });
});

describe('assertEmail', () => {
  it('returns a normalized email', () => {
    expect(assertEmail('Ada@Example.com')).toBe('ada@example.com');
  });

  it('rejects malformed addresses', () => {
    expect(() => assertEmail('not-an-email')).toThrow(/valid email/i);
  });
});

describe('assertPassword', () => {
  it('accepts passwords of at least 8 characters', () => {
    expect(assertPassword('password1')).toBe('password1');
  });

  it('rejects short passwords', () => {
    expect(() => assertPassword('short')).toThrow(/at least 8/i);
  });
});

describe('assertPasswordsMatch', () => {
  it('returns the password when both sides match and meet length', () => {
    expect(assertPasswordsMatch('password1', 'password1')).toBe('password1');
  });

  it('rejects a length failure before comparing', () => {
    expect(() => assertPasswordsMatch('short', 'short')).toThrow(/at least 8/i);
  });

  it('rejects mismatched confirmation', () => {
    expect(() => assertPasswordsMatch('password1', 'password2')).toThrow(
      /do not match/i,
    );
  });
});

describe('assertOtp', () => {
  it('accepts an 8-digit code', () => {
    expect(assertOtp('12345678')).toBe('12345678');
  });

  it('strips spaces before validating', () => {
    expect(assertOtp('1234 5678')).toBe('12345678');
  });

  it('rejects non-8-digit codes', () => {
    expect(() => assertOtp('1234')).toThrow(/8-digit/i);
    expect(() => assertOtp('abcdefgh')).toThrow(/8-digit/i);
  });
});

describe('authErrorMessage', () => {
  it('reads Error.message and falls back for unknowns', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('boom');
    expect(authErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
