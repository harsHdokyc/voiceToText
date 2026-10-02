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
import { signUpWithPassword } from '@/features/auth/services/auth-service';
import { normalizeEmail } from '@/features/auth/services/auth-validation';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const { session, isLoading } = useAuth();
  const { busy, message, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isLoading && session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthScreen
      title="Create account"
      subtitle="We'll email an 8-digit code to confirm your address"
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
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="Password (min 8 characters)"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Sign up"
        busy={busy}
        onPress={() =>
          void run(async () => {
            const result = await signUpWithPassword(email, password);
            if (result.session) {
              router.replace('/(app)');
              return;
            }
            router.push({
              pathname: '/(auth)/verify-otp',
              params: {
                email: normalizeEmail(email),
                purpose: 'signup',
              },
            });
          })
        }
      />
      <AuthLink href="/(auth)/sign-in" label="Already have an account? Sign in" />
    </AuthScreen>
  );
}
