import { useState } from 'react';
import { Redirect } from 'expo-router';

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthScreen,
} from '@/features/auth/components/auth-ui';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { signInWithPassword } from '@/features/auth/services/auth-service';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const { session, isLoading } = useAuth();
  const { busy, message, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isLoading && session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthScreen title="Voice-to-Work" subtitle="Sign in with email and password">
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
        autoComplete="password"
        placeholder="Password"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Sign in"
        busy={busy}
        onPress={() =>
          void run(async () => {
            await signInWithPassword(email, password);
          })
        }
      />
      <AuthLink href="/(auth)/forgot-password" label="Forgot password?" />
      <AuthLink href="/(auth)/sign-up" label="Create an account" />
    </AuthScreen>
  );
}
