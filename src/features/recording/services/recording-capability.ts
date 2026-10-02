import { requestRecordingPermissionsAsync } from 'expo-audio';

import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/constants';

/** Phase 0 probe — confirms expo-audio is linked and documents the V1 duration cap. */
export async function getRecordingCapability() {
  const status = await requestRecordingPermissionsAsync();
  return {
    package: 'expo-audio' as const,
    permissionGranted: status.granted,
    maxDurationSeconds: MAX_AUDIO_DURATION_SECONDS,
    note: 'Recording UI lands in Phase 2; cap enforced before upload/process.',
  };
}
