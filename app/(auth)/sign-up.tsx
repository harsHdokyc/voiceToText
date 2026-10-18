import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Text } from 'react-native';

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
import {
  DISPLAY_NAME_MAX,
  normalizeDisplayName,
} from '@/features/settings/services/greeting-name';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts } from '@/theme';

export default function SignUpScreen() {
  const { session, isLoading } = useAuth();
  const { busy, message, run } = useAuthAction();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isLoading && session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthScreen
      title={
        <>
          Make room for <Text style={styles.accent}>ideas.</Text>
        </>
      }
      subtitle="A place for your thoughts to become next steps."
    >
      <AuthField
        autoComplete="name"
        autoCapitalize="words"
        placeholder="Your name"
        textContentType="name"
        value={name}
        maxLength={DISPLAY_NAME_MAX}
        onChangeText={(t) => setName(t.slice(0, DISPLAY_NAME_MAX))}
      />
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
        autoComplete="new-password"
        placeholder="Password (min 8 characters)"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Create account"
        busy={busy}
        onPress={() =>
          void run(async () => {
            const displayName = normalizeDisplayName(name);
            if (!displayName) {
              throw new Error('Enter your name');
            }
            const result = await signUpWithPassword(
              email,
              password,
              displayName,
            );
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

const styles = {
  accent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
};
