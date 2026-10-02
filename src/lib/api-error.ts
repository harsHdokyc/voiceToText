/**
 * Stable API error shape: machine `code` + human `reason` (not a generic blob).
 */

export class ApiError extends Error {
  readonly code: string;
  readonly reason: string;
  readonly cause?: unknown;

  constructor(code: string, reason: string, cause?: unknown) {
    super(reason);
    this.name = 'ApiError';
    this.code = code;
    this.reason = reason;
    this.cause = cause;
  }
}

export type DescribedError = {
  code: string;
  reason: string;
};

/** Map unknown throws (Supabase Auth/Postgrest/Storage/Functions, Error) to code+reason. */
export function describeError(error: unknown): DescribedError {
  if (error instanceof ApiError) {
    return { code: error.code, reason: error.reason };
  }

  if (error && typeof error === 'object') {
    const e = error as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
      status?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const message =
      typeof e.message === 'string' && e.message.trim()
        ? e.message.trim()
        : null;
    const code =
      typeof e.code === 'string' && e.code.trim()
        ? e.code.trim()
        : typeof e.status === 'number'
          ? `http_${e.status}`
          : null;

    if (code && message) {
      const detail =
        typeof e.details === 'string' && e.details.trim()
          ? ` (${e.details.trim()})`
          : '';
      return { code, reason: `${message}${detail}` };
    }
    if (message) {
      const name =
        typeof e.name === 'string' && e.name !== 'Error' ? e.name : 'error';
      return { code: name, reason: message };
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return { code: 'error', reason: error.trim() };
  }

  return { code: 'unknown', reason: 'Unknown error' };
}

/** Prefer API/Supabase reason for UI; keep authErrorMessage compatible. */
export function errorMessageForUi(
  error: unknown,
  fallback = 'Something went wrong',
) {
  const { code, reason } = describeError(error);
  if (code === 'unknown' && reason === 'Unknown error') return fallback;
  return reason;
}
