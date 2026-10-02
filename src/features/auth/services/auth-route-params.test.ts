import { describe, expect, it } from 'vitest';

import {
  emailFromRouteParam,
  emailOtpTypeForPurpose,
  otpPurposeFromRouteParam,
} from './auth-route-params';

describe('emailFromRouteParam', () => {
  it('normalizes a string param', () => {
    expect(emailFromRouteParam('  Ada@Example.com ')).toBe('ada@example.com');
  });

  it('uses the first value when Expo passes an array', () => {
    expect(emailFromRouteParam(['One@x.com', 'two@x.com'])).toBe('one@x.com');
  });

  it('returns empty string when missing', () => {
    expect(emailFromRouteParam(undefined)).toBe('');
  });
});

describe('otpPurposeFromRouteParam', () => {
  it('accepts recovery and defaults everything else to signup', () => {
    expect(otpPurposeFromRouteParam('recovery')).toBe('recovery');
    expect(otpPurposeFromRouteParam(['recovery'])).toBe('recovery');
    expect(otpPurposeFromRouteParam('signup')).toBe('signup');
    expect(otpPurposeFromRouteParam('nope')).toBe('signup');
    expect(otpPurposeFromRouteParam(undefined)).toBe('signup');
  });
});

describe('emailOtpTypeForPurpose', () => {
  it('maps purpose to Supabase verifyOtp types', () => {
    expect(emailOtpTypeForPurpose('recovery')).toBe('recovery');
    expect(emailOtpTypeForPurpose('signup')).toBe('signup');
  });
});
