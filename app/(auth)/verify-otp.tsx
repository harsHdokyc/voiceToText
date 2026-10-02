import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import {
  AuthButton,
  AuthField,
  AuthMessage,
  AuthScreen,
} from '@/features/auth/components/auth-ui';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import {
  requestPasswordReset,
  resendSignupOtp,
  verifyEmailOtp,
} from '@/features/auth/services/auth-service';
import {
  emailFromRouteParam,
  otpPurposeFromRouteParam,
} from '@/features/auth/services/auth-route-params';
import { EMAIL_OTP_LENGTH } from '@/lib/constants';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const email = useMemo(() => emailFromRouteParam(params.email), [params.email]);
  const purpose = useMemo(
    () => otpPurposeFromRouteParam(params.purpose),
    [params.purpose],
  );
  const { busy, message, run } = useAuthAction();
  const [token, setToken] = useState('');

  const subtitle =
    purpose === 'recovery'
      ? `Enter the ${EMAIL_OTP_LENGTH}-digit code sent to ${email || 'your email'}`
      : `Enter the ${EMAIL_OTP_LENGTH}-digit confirmation code sent to ${email || 'your email'}`;

  return (
    <AuthScreen title="Enter code" subtitle={subtitle}>
      <AuthField
        autoCapitalize="none"
        autoComplete="one-time-code"
        keyboardType="number-pad"
        maxLength={EMAIL_OTP_LENGTH}
        placeholder={`${EMAIL_OTP_LENGTH}-digit code`}
        textContentType="oneTimeCode"
        value={token}
        onChangeText={setToken}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Verify code"
        busy={busy}
        onPress={() =>
          void run(async () => {
            if (!email) throw new Error('Missing email — go back and try again');
            await verifyEmailOtp(email, token, purpose);
            if (purpose === 'recovery') {
              router.replace('/(auth)/reset-password');
              return;
            }
            router.replace('/(app)');
          })
        }
      />
      <AuthButton
        label="Resend code"
        variant="ghost"
        busy={busy}
        onPress={() =>
          void run(async () => {
            if (!email) throw new Error('Missing email — go back and try again');
            if (purpose === 'recovery') {
              await requestPasswordReset(email);
            } else {
              await resendSignupOtp(email);
            }
          }, 'Code sent — check your email')
        }
      />
    </AuthScreen>
  );
}
