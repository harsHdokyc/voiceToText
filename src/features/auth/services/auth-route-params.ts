export type OtpPurpose = 'signup' | 'recovery';

/** Expo Router params may be `string | string[]`. */
export function emailFromRouteParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').trim().toLowerCase();
}

export function otpPurposeFromRouteParam(
  value: string | string[] | undefined,
): OtpPurpose {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'recovery' ? 'recovery' : 'signup';
}

/** Maps app OTP purpose to Supabase `EmailOtpType` for verifyOtp. */
export function emailOtpTypeForPurpose(purpose: OtpPurpose) {
  return purpose === 'recovery' ? 'recovery' : 'signup';
}
