import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SaydoWordmark } from '@/components/saydo-mark';
import { Button, Eyebrow, TextField } from '@/components/ui';
import { signOut } from '@/features/auth/services/auth-service';
import { registerForPushNotifications } from '@/features/reminders/services/push-registration';
import { deleteAccount } from '@/features/settings/services/account-service';
import { privacyDisclosureParagraphs } from '@/features/settings/services/privacy-disclosure';
import {
  DISPLAY_NAME_MAX,
  getOwnProfile,
  updateOwnDisplayName,
} from '@/features/settings/services/profile-service';
import { errorMessageForUi } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/theme';

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: getOwnProfile,
  });

  useEffect(() => {
    if (profile.data?.display_name != null) {
      setDisplayName(profile.data.display_name);
    }
  }, [profile.data?.display_name]);

  const saveName = useMutation({
    mutationFn: () => updateOwnDisplayName(displayName),
    onSuccess: async () => {
      setSavedFlash(true);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(() => setSavedFlash(false), 1600);
    },
  });

  const push = useMutation({
    mutationFn: () => registerForPushNotifications(),
  });

  const leave = useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      await queryClient.clear();
    },
  });

  const wipe = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      await queryClient.clear();
    },
  });

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

  const busy =
    saveName.isPending ||
    push.isPending ||
    leave.isPending ||
    wipe.isPending;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <SaydoWordmark markSize={40} style={styles.brand} />
      <Eyebrow>Make yourself at home</Eyebrow>
      <Text style={styles.title}>Your workspace.</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Display name</Text>
        <TextField
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t.slice(0, DISPLAY_NAME_MAX));
            setSavedFlash(false);
          }}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="Your name"
          editable={!busy}
          autoCapitalize="words"
        />
        <Text style={styles.hint}>
          Shown on Overview · max {DISPLAY_NAME_MAX} characters
        </Text>
        <Button
          variant="cta"
          disabled={busy || !displayName.trim()}
          onPress={() => saveName.mutate()}
          style={styles.saveBtn}
        >
          {saveName.isPending
            ? 'Saving…'
            : savedFlash
              ? 'Saved'
              : 'Save changes'}
        </Button>
        {saveName.error ? (
          <Text style={styles.error}>
            {errorMessageForUi(saveName.error, 'Save failed')}
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>Privacy</Text>
      {privacyDisclosureParagraphs().map((p) => (
        <Text key={p.slice(0, 24)} style={styles.body}>
          {p}
        </Text>
      ))}

      <Text style={styles.section}>Notifications</Text>
      <Button
        variant="quiet"
        disabled={busy}
        onPress={() => push.mutate()}
      >
        {push.isPending ? 'Enabling…' : 'Enable push reminders'}
      </Button>
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
      <Button
        variant="quiet"
        disabled={busy}
        onPress={() => leave.mutate()}
      >
        {leave.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
      <Button
        variant="destructive"
        disabled={busy}
        onPress={confirmDeleteAccount}
      >
        {wipe.isPending ? 'Deleting…' : 'Delete account'}
      </Button>
      {wipe.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(wipe.error, 'Account delete failed')}
        </Text>
      ) : null}
      {leave.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(leave.error, 'Sign out failed')}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setDevOpen((v) => !v)}
        hitSlop={8}
        style={styles.devToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: devOpen }}
      >
        <Text style={styles.devToggleText}>
          {devOpen ? 'Hide developer' : 'Developer'}
        </Text>
      </Pressable>
      {devOpen ? (
        <View style={styles.devBlock}>
          <Button variant="quiet" size="sm" onPress={() => health.mutate()}>
            health
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onPress={() => spike.mutate('config')}
          >
            openai-spike config
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onPress={() => spike.mutate('chat')}
          >
            openai-spike chat
          </Button>
          {health.data ? (
            <Text style={styles.meta}>{JSON.stringify(health.data)}</Text>
          ) : null}
          {spike.data ? (
            <Text style={styles.meta}>{JSON.stringify(spike.data)}</Text>
          ) : null}
          {health.error || spike.error ? (
            <Text style={styles.error}>
              {errorMessageForUi(
                health.error ?? spike.error,
                'Request failed',
              )}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: space[5],
    gap: space[3],
    paddingBottom: space[10],
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { marginBottom: space[2] },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
    marginBottom: space[2],
  },
  block: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[6],
    gap: space[2],
    marginBottom: space[2],
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.stone,
  },
  saveBtn: { alignSelf: 'flex-start', marginTop: space[2] },
  section: {
    marginTop: space[4],
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.stone,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  devToggle: {
    marginTop: space[6],
    minHeight: 44,
    justifyContent: 'center',
  },
  devToggleText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.stone,
  },
  devBlock: { gap: space[2] },
});
