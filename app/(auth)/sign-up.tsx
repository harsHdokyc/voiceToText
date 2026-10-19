import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  AuthButton,
  AuthLabeledField,
  AuthMessage,
  AuthPasswordField,
  AuthScreen,
  AuthTabs,
} from '@/features/auth/components/auth-ui';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { signUpWithPassword } from '@/features/auth/services/auth-service';
import { normalizeEmail } from '@/features/auth/services/auth-validation';
import {
  DISPLAY_NAME_MAX,
  normalizeDisplayName,
} from '@/features/settings/services/greeting-name';
import { useAuth } from '@/providers/auth-provider';

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
          Make room for <Text className="font-sans-italic text-cobalt">ideas.</Text>
        </>
      }
      subtitle="A place for your thoughts to become next steps."
      tabs={<AuthTabs active="signup" />}
    >
      <AuthLabeledField
        label="Name"
        autoComplete="name"
        autoCapitalize="words"
        placeholder="Your name"
        textContentType="name"
        value={name}
        maxLength={DISPLAY_NAME_MAX}
        onChangeText={(t) => setName(t.slice(0, DISPLAY_NAME_MAX))}
      />
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
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Create account →"
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
    </AuthScreen>
  );
}

