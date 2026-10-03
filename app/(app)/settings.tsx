import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/features/reminders/services/push-registration';
import {
  deleteAccount,
} from '@/features/settings/services/account-service';
import { privacyDisclosureParagraphs } from '@/features/settings/services/privacy-disclosure';
import { errorMessageForUi } from '@/lib/api-error';

export default function SettingsScreen() {
  const queryClient = useQueryClient();

  const health = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health');
      if (error) throw error;
      return data;
    },
  });

  const spike = useMutation({
    mutationFn: async (probe: 'config' | 'chat') => {
      const { data, error } = await supabase.functions.invoke('openai-spike', {
        body: { probe },
      });
      if (error) throw error;
      return data;
    },
  });

  const push = useMutation({
    mutationFn: () => registerForPushNotifications(),
  });

  const wipe = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      await queryClient.clear();
    },
  });

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your notes, audio, tasks, reminders, and account. Type confirmation is DELETE on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => wipe.mutate(),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Privacy</Text>
      {privacyDisclosureParagraphs().map((p) => (
        <Text key={p.slice(0, 24)} style={styles.body}>
          {p}
        </Text>
      ))}

      <Text style={styles.section}>Notifications</Text>
      <Pressable
        style={styles.button}
        disabled={push.isPending}
        onPress={() => push.mutate()}
      >
        <Text style={styles.buttonText}>
          {push.isPending ? 'Enabling…' : 'Enable push reminders'}
        </Text>
      </Pressable>
      {push.data ? (
        <Text style={styles.meta}>
          {push.data.skipped
            ? `Skipped (${push.data.reason})`
            : 'Push token registered'}
        </Text>
      ) : null}
      {push.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(push.error, 'Push registration failed')}
        </Text>
      ) : null}

      <Text style={styles.section}>Account</Text>
      <Pressable
        style={[styles.button, styles.danger]}
        disabled={wipe.isPending}
        onPress={confirmDeleteAccount}
      >
        <Text style={styles.buttonText}>
          {wipe.isPending ? 'Deleting…' : 'Delete account'}
        </Text>
      </Pressable>
      {wipe.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(wipe.error, 'Account delete failed')}
        </Text>
      ) : null}

      <Text style={styles.section}>Debug</Text>
      <Pressable style={styles.button} onPress={() => health.mutate()}>
        <Text style={styles.buttonText}>health</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => spike.mutate('config')}>
        <Text style={styles.buttonText}>openai-spike config</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => spike.mutate('chat')}>
        <Text style={styles.buttonText}>openai-spike chat</Text>
      </Pressable>
      {health.data ? <Text style={styles.meta}>{JSON.stringify(health.data)}</Text> : null}
      {spike.data ? <Text style={styles.meta}>{JSON.stringify(spike.data)}</Text> : null}
      {health.error || spike.error ? (
        <Text style={styles.error}>
          {(health.error ?? spike.error) instanceof Error
            ? (health.error ?? spike.error)!.message
            : 'Request failed'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  section: { marginTop: 12, fontWeight: '700', fontSize: 16 },
  body: { color: '#333', lineHeight: 20 },
  meta: { color: '#555', fontSize: 12 },
  button: {
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  danger: { backgroundColor: '#7a2e0b' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#7a2e0b' },
});
