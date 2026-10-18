import { useState } from 'react';
import { Redirect } from 'expo-router';
import { Text } from 'react-native';

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
import { colors, fonts } from '@/theme';

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
          Welcome <Text style={styles.accent}>back.</Text>
        </>
      }
      subtitle="Pick up where your thoughts left off."
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
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

const styles = {
  accent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
};
