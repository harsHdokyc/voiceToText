import { useState } from 'react';
import { Redirect, router } from 'expo-router';

import {
  AuthButton,
  AuthField,
  AuthMessage,
  AuthScreen,
} from '@/features/auth/components/auth-ui';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { updatePassword } from '@/features/auth/services/auth-service';
import { useAuth } from '@/providers/auth-provider';

export default function ResetPasswordScreen() {
  const { session, isLoading } = useAuth();
  const { busy, message, run } = useAuthAction();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/forgot-password" />;
  }

  return (
    <AuthScreen
      title="Set new password"
      subtitle="Choose a new password for your account"
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="New password (min 8 characters)"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="Confirm new password"
        secureTextEntry
        textContentType="newPassword"
        value={confirm}
        onChangeText={setConfirm}
      />
      <AuthMessage>{message}</AuthMessage>
      <AuthButton
        label="Update password"
        busy={busy}
        onPress={() =>
          void run(async () => {
            if (password !== confirm) {
              throw new Error('Passwords do not match');
            }
            await updatePassword(password);
            router.replace('/(app)');
          })
        }
      />
    </AuthScreen>
  );
}
