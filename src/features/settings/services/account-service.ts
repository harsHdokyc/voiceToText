import { invokeEdge } from '@/lib/invoke-edge';
import { withApiLog } from '@/lib/with-api-log';
import { signOut } from '@/features/auth/services/auth-service';

/** Irreversible: wipe app data + auth user. confirm must be DELETE. */
export async function deleteAccount() {
  return withApiLog('api.account.delete', {}, async () => {
    const body = await invokeEdge('delete-account', 'account_delete', { confirm: 'DELETE' });
    await signOut();
    return body;
  });
}

/** Developer panel probes (dev builds only). */
export async function runEdgeProbe(fn: 'health' | 'openai-spike', body?: Record<string, unknown>) {
  return withApiLog('api.dev.probe', { fn }, () => invokeEdge(fn, 'dev_probe', body));
}
