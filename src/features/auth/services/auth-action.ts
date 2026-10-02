import { authErrorMessage } from '@/features/auth/services/auth-validation';

/** Pure settle helper — keeps auth screen busy/error behavior testable without RN. */
export async function settleAuthAction(
  action: () => Promise<void>,
  successMessage?: string,
): Promise<{ message: string | null }> {
  try {
    await action();
    return { message: successMessage ?? null };
  } catch (error) {
    return { message: authErrorMessage(error) };
  }
}
