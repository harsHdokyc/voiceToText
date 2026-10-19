import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  AuthButton,
  AuthLabeledField,
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
      title={
        <>
          A fresh{' '}
          <Text className="font-sans-italic text-cobalt">start.</Text>
        </>
      }
      subtitle="Get back to what matters. We'll email an 8-digit code."
    >
      <AuthLabeledField
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Send reset code →"
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
