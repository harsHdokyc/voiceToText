import { useState } from 'react';
import { Redirect, router } from 'expo-router';

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthScreen,
} from '@/features/auth/components/auth-ui';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { requestPasswordReset } from '@/features/auth/services/auth-service';
import { normalizeEmail } from '@/features/auth/services/auth-validation';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { session, isLoading } = useAuth();
  const { busy, message, run } = useAuthAction();
  const [email, setEmail] = useState('');

  if (!isLoading && session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthScreen
      title="Forgot password"
      subtitle="We'll email an 8-digit code so you can set a new password"
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Send reset code"
        busy={busy}
        onPress={() =>
          void run(async () => {
            await requestPasswordReset(email);
            router.push({
              pathname: '/(auth)/verify-otp',
              params: {
                email: normalizeEmail(email),
                purpose: 'recovery',
              },
            });
          })
        }
      />
      <AuthLink href="/(auth)/sign-in" label="Back to sign in" />
    </AuthScreen>
  );
}
