import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  AuthButton,
  AuthInlineLink,
  AuthLabeledField,
  AuthMessage,
  AuthPasswordField,
  AuthScreen,
  AuthTabs,
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
    <AuthScreen
      title={
        <>
          Welcome <Text className="font-sans-italic text-cobalt">back.</Text>
        </>
      }
      subtitle="Pick up where your thoughts left off."
      tabs={<AuthTabs active="signin" />}
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
      <AuthPasswordField
        label="Password"
        trailing={
          <AuthInlineLink
            href="/(auth)/forgot-password"
            label="Forgot password?"
          />
        }
        autoCapitalize="none"
        autoComplete="password"
        placeholder="At least 8 characters"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Continue →"
        busy={busy}
        onPress={() =>
          void run(async () => {
            await signInWithPassword(email, password);
          })
        }
      />
    </AuthScreen>
  );
}

