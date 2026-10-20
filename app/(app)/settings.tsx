import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { SaydoWordmark } from '@/components/saydo-mark';
import { Button, Eyebrow, TextField } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
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
import { space } from '@/theme';

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
    <WorkspacePage gap={space[3]} contentClassName="max-w-[560px]">
      <SaydoWordmark markSize={40} className="mb-2" />
      <Eyebrow>Make yourself at home</Eyebrow>
      <Text className="mb-2 font-display text-4xl text-ink">Your workspace.</Text>

      <View className="mb-2 gap-2 border-t border-border pt-6">
        <Text className="font-sans text-sm text-ink">Display name</Text>
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
        <Text className="font-sans text-[13px] text-stone">
          Shown on Overview · max {DISPLAY_NAME_MAX} characters
        </Text>
        <Button
          variant="cta"
          disabled={busy || !displayName.trim()}
          onPress={() => saveName.mutate()}
          className="mt-2 self-start"
        >
          {saveName.isPending
            ? 'Saving…'
            : savedFlash
              ? 'Saved'
              : 'Save changes'}
        </Button>
        {saveName.error ? (
          <Text className="font-sans text-sm text-destructive">
            {errorMessageForUi(saveName.error, 'Save failed')}
          </Text>
        ) : null}
      </View>

      <Text className="mt-4 font-sans-medium text-base text-ink">Privacy</Text>
      {privacyDisclosureParagraphs().map((p) => (
        <Text key={p.slice(0, 24)} className="font-sans text-sm leading-[21px] text-ink">
          {p}
        </Text>
      ))}

      <Text className="mt-4 font-sans-medium text-base text-ink">Notifications</Text>
      <Button
        variant="quiet"
        disabled={busy}
        onPress={() => push.mutate()}
      >
        {push.isPending ? 'Enabling…' : 'Enable push reminders'}
      </Button>
      {push.data ? (
        <Text className="font-sans text-xs text-stone">
          {push.data.skipped
            ? `Skipped (${push.data.reason})`
            : 'Push token registered'}
        </Text>
      ) : null}
      {push.error ? (
        <Text className="font-sans text-sm text-destructive">
          {errorMessageForUi(push.error, 'Push registration failed')}
        </Text>
      ) : null}

      <Text className="mt-4 font-sans-medium text-base text-ink">Account</Text>
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
        <Text className="font-sans text-sm text-destructive">
          {errorMessageForUi(wipe.error, 'Account delete failed')}
        </Text>
      ) : null}
      {leave.error ? (
        <Text className="font-sans text-sm text-destructive">
          {errorMessageForUi(leave.error, 'Sign out failed')}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setDevOpen((v) => !v)}
        hitSlop={8}
        className="mt-6 min-h-[44px] justify-center rounded-md px-2 transition-colors duration-200 hover:bg-lime active:bg-lime/80"
        accessibilityRole="button"
        accessibilityState={{ expanded: devOpen }}
      >
        <Text className="font-mono text-[11px] uppercase tracking-wide text-stone">
          {devOpen ? 'Hide developer' : 'Developer'}
        </Text>
      </Pressable>
      {devOpen ? (
        <View className="gap-2">
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
            <Text className="font-sans text-xs text-stone">
              {JSON.stringify(health.data)}
            </Text>
          ) : null}
          {spike.data ? (
            <Text className="font-sans text-xs text-stone">
              {JSON.stringify(spike.data)}
            </Text>
          ) : null}
          {health.error || spike.error ? (
            <Text className="font-sans text-sm text-destructive">
              {errorMessageForUi(
                health.error ?? spike.error,
                'Request failed',
              )}
            </Text>
          ) : null}
        </View>
      ) : null}
    </WorkspacePage>
  );
}
