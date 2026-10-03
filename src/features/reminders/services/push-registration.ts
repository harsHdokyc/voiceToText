import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';

export type DevicePlatform = 'ios' | 'android' | 'web';

function platformForToken(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Request permission + Expo push token, then upsert via Edge register-push-token.
 * No-ops gracefully on web / simulators without push.
 */
export async function registerForPushNotifications() {
  return withApiLog('api.push.register', { platform: Platform.OS }, async () => {
    if (Platform.OS === 'web') {
      return { ok: true as const, skipped: true as const, reason: 'web' };
    }
    if (!Device.isDevice) {
      return {
        ok: true as const,
        skipped: true as const,
        reason: 'simulator',
      };
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked.status;
    }
    if (finalStatus !== 'granted') {
      throw new ApiError(
        'push_permission_denied',
        'Notification permission was not granted',
      );
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data?.trim();
    if (!token) {
      throw new ApiError('push_token_missing', 'Expo push token missing');
    }

    const { data, error } = await supabase.functions.invoke(
      'register-push-token',
      {
        body: {
          token,
          platform: platformForToken(),
        },
      },
    );
    if (error) {
      throw new ApiError(
        'push_register_failed',
        error.message,
        error,
      );
    }
    const body = data as { ok?: boolean; error?: string } | null;
    if (!body?.ok) {
      throw new ApiError(
        body?.error ?? 'push_register_failed',
        body?.error ?? 'register-push-token failed',
      );
    }
    return { ok: true as const, skipped: false as const, token };
  });
}
