import { useState } from 'react';

import { settleAuthAction } from '@/features/auth/services/auth-action';

/** Shared busy/error wrapper for auth screens. */
export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const settled = await settleAuthAction(action, successMessage);
      setMessage(settled.message);
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, run };
}
