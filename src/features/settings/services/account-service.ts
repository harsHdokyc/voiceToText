import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import { signOut } from '@/features/auth/services/auth-service';

export async function deleteNote(noteId: string) {
  return withApiLog('api.notes.delete', { noteId }, async () => {
    const { data, error } = await supabase.functions.invoke('delete-note', {
      body: { noteId },
    });
    const body = data as { ok?: boolean; error?: string; reason?: string } | null;
    if (error) {
      throw new ApiError(
        body?.error ?? 'note_delete_failed',
        body?.reason ?? error.message,
        error,
      );
    }
    if (!body?.ok) {
      throw new ApiError(
        body?.error ?? 'note_delete_failed',
        body?.reason ?? 'delete-note failed',
      );
    }
    return body;
  });
}

/** Irreversible: wipe app data + auth user. confirm must be DELETE. */
export async function deleteAccount() {
  return withApiLog('api.account.delete', {}, async () => {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { confirm: 'DELETE' },
    });
    const body = data as { ok?: boolean; error?: string; reason?: string } | null;
    if (error) {
      throw new ApiError(
        body?.error ?? 'account_delete_failed',
        body?.reason ?? error.message,
        error,
      );
    }
    if (!body?.ok) {
      throw new ApiError(
        body?.error ?? 'account_delete_failed',
        body?.reason ?? 'delete-account failed',
      );
    }
    await signOut();
    return body;
  });
}
