import type { EmailOtpType } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { emailOtpTypeForPurpose, type OtpPurpose } from '@/features/auth/services/auth-route-params';
import {
  assertEmail,
  assertOtp,
  assertPassword,
} from '@/features/auth/services/auth-validation';

export type { OtpPurpose };

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: assertEmail(email),
    password: assertPassword(password),
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: assertEmail(email),
    password: assertPassword(password),
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  purpose: OtpPurpose,
) {
  const type: EmailOtpType = emailOtpTypeForPurpose(purpose);
  const { data, error } = await supabase.auth.verifyOtp({
    email: assertEmail(email),
    token: assertOtp(token),
    type,
  });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: assertEmail(email),
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(assertEmail(email));
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: assertPassword(password),
  });
  if (error) throw error;
  return data;
}
