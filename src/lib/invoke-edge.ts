import { ApiError } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';

/** Envelope every Edge Function returns alongside its own fields. */
export type EdgeEnvelope = { ok?: boolean; error?: string; reason?: string };

/**
 * Map a `functions.invoke` result to its body, or throw ApiError(code, reason).
 * Codes: body.error when present, else `${codePrefix}_failed` / `${codePrefix}_empty`.
 */
export function edgeResult<T extends object>(
  fn: string,
  codePrefix: string,
  data: unknown,
  error: { message: string } | null,
): T & EdgeEnvelope {
  const body = (data ?? null) as (T & EdgeEnvelope) | null;
  const reasonFromBody = body?.reason ?? (body?.error ? `${fn} failed: ${body.error}` : undefined);
  if (error) {
    throw new ApiError(body?.error ?? `${codePrefix}_failed`, reasonFromBody ?? error.message, error);
  }
  if (!body) throw new ApiError(`${codePrefix}_empty`, `${fn} returned an empty body`);
  if (body.ok === false) {
    throw new ApiError(body.error ?? `${codePrefix}_failed`, reasonFromBody ?? `${fn} returned ok:false`);
  }
  return body;
}

/** functions-js returns `data: null` on non-2xx; the function's JSON body is on `error.context` (a Response). */
async function errorBody(error: unknown): Promise<unknown> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (typeof context?.json !== 'function') return null;
  return context.json().catch(() => null);
}

export async function invokeEdge<T extends object>(
  fn: string,
  codePrefix: string,
  body?: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(fn, body ? { body } : undefined);
  return edgeResult<T>(fn, codePrefix, data ?? (error ? await errorBody(error) : null), error);
}
