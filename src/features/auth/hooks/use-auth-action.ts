import { useState } from 'react';

import { authErrorMessage } from '@/features/auth/services/auth-validation';

/** Shared busy/error wrapper for auth screens. */
export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (successMessage) setMessage(successMessage);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, run };
}
