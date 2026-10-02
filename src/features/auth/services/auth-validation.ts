import { EMAIL_OTP_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/constants';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function assertEmail(email: string) {
  const value = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Enter a valid email address');
  }
  return value;
}

export function assertPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return password;
}

export function assertPasswordsMatch(password: string, confirm: string) {
  assertPassword(password);
  if (password !== confirm) {
    throw new Error('Passwords do not match');
  }
  return password;
}

export function assertOtp(token: string) {
  const value = token.replace(/\s/g, '');
  if (!new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`).test(value)) {
    throw new Error(`Enter the ${EMAIL_OTP_LENGTH}-digit code from your email`);
  }
  return value;
}

export function authErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}
