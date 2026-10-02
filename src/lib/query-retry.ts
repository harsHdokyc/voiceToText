/** QueryClient retry policy for app data fetches. */

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status =
    typeof error === 'object' &&
    error &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : undefined;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}
