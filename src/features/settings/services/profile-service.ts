import { ApiError } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';
import { normalizeDisplayName } from '@/features/settings/services/greeting-name';
import {
  deviceTimeZone,
  timeZoneToSync,
} from '@/features/settings/services/time-zone';

export type ProfileRow = {
  id: string;
  display_name: string | null;
};

export async function getOwnProfile() {
  return withApiLog('api.profile.get', {}, async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, timezone')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;

    const timezone = data ? timeZoneToSync(deviceTimeZone(), data.timezone) : null;
    if (timezone) {
      // Best effort: a failed sync only leaves "today" on the old zone.
      await withApiLog('api.profile.sync_timezone', { timezone }, async () => {
        const { error: tzError } = await supabase
          .from('profiles')
          .update({ timezone, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (tzError) throw tzError;
      }).catch(() => undefined);
    }

    return (data as ProfileRow | null) ?? { id: user.id, display_name: null };
  });
}

/** Persist Settings display name to profiles (+ auth metadata for shell fallback). */
export async function updateOwnDisplayName(raw: string) {
  return withApiLog('api.profile.update_display_name', {}, async () => {
    const displayName = normalizeDisplayName(raw);
    if (!displayName) {
      throw new ApiError('display_name_required', 'Display name is required');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new ApiError('not_signed_in', 'Not signed in');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, display_name')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError('profile_update_lost', 'Profile update matched no row');
    }

    await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    return data as ProfileRow;
  });
}
