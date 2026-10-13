import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';

export type ProfileRow = {
  id: string;
  display_name: string | null;
};

export { greetingName } from '@/features/settings/services/greeting-name';

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
      .select('id, display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? { id: user.id, display_name: null };
  });
}
