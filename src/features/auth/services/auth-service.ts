import type { EmailOtpType } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';
import {
  emailOtpTypeForPurpose,
  type OtpPurpose,
} from '@/features/auth/services/auth-route-params';
import {
  assertEmail,
  assertOtp,
  assertPassword,
} from '@/features/auth/services/auth-validation';

export type { OtpPurpose };

export async function signInWithPassword(email: string, password: string) {
  return withApiLog('api.auth.sign_in', {}, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: assertEmail(email),
      password: assertPassword(password),
    });
    if (error) throw error;
    return data;
  });
}

export async function signUpWithPassword(email: string, password: string) {
  return withApiLog('api.auth.sign_up', {}, async () => {
    const { data, error } = await supabase.auth.signUp({
      email: assertEmail(email),
      password: assertPassword(password),
    });
    if (error) throw error;
    return data;
  });
}

export async function signOut() {
  return withApiLog('api.auth.sign_out', {}, async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  });
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  purpose: OtpPurpose,
) {
  return withApiLog('api.auth.verify_otp', { purpose }, async () => {
    const type: EmailOtpType = emailOtpTypeForPurpose(purpose);
    const { data, error } = await supabase.auth.verifyOtp({
      email: assertEmail(email),
      token: assertOtp(token),
      type,
    });
    if (error) throw error;
    return data;
  });
}

export async function resendSignupOtp(email: string) {
  return withApiLog('api.auth.resend_signup_otp', {}, async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: assertEmail(email),
    });
    if (error) throw error;
  });
}

export async function requestPasswordReset(email: string) {
  return withApiLog('api.auth.request_password_reset', {}, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      assertEmail(email),
    );
    if (error) throw error;
  });
}

export async function updatePassword(password: string) {
  return withApiLog('api.auth.update_password', {}, async () => {
    const { data, error } = await supabase.auth.updateUser({
      password: assertPassword(password),
    });
    if (error) throw error;
    return data;
  });
}
