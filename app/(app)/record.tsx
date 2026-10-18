import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useCaptureOptional } from '@/components/capture-sheet';

/**
 * Legacy deep link — capture lives as an in-shell Modal (prototype Dialog),
 * not a separate screen. Opening this route pops the modal and returns home.
 */
export default function RecordRedirect() {
  const capture = useCaptureOptional();

  useEffect(() => {
    capture?.openCapture();
  }, [capture]);

  return <Redirect href="/(app)" />;
}
