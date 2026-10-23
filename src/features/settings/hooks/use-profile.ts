import { useQuery } from '@tanstack/react-query';

import { greetingName } from '@/features/settings/services/greeting-name';
import { getOwnProfile } from '@/features/settings/services/profile-service';
import { useAuth } from '@/providers/auth-provider';

/** Own profile + the name to greet the user by (profile, then signup metadata, then email). */
export function useProfile() {
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ['profile'], queryFn: getOwnProfile, staleTime: 60_000 });
  const name = greetingName(
    profile.data?.display_name ?? (user?.user_metadata?.display_name as string | undefined),
    user?.email,
  );
  return { profile, name };
}
