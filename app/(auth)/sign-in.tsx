import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  AuthButton,
  AuthLabeledField,
  AuthMessage,
  AuthPasswordField,
  AuthScreen,
  AuthTabs,
  authInlineLinkStyle,
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
          <Link href="/(auth)/forgot-password" style={authInlineLinkStyle}>
            Forgot password?
          </Link>
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

const styles = {
  accent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
};
