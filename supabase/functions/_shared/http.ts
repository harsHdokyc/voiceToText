import { describeProcessError } from "./ai/provider-utils.ts";
import { edgeLog } from "./log.ts";

/**
 * Per-request fail/log helper. Every failure logs a `[vtw]` fail line with
 * `code` + `reason` + `durationMs` and returns the `{ ok:false, error, reason }`
 * envelope that the app's `edgeResult` maps to ApiError(code, reason).
 */
export function edgeRequest(scope: string, nowMs: () => number = Date.now) {
  const started = nowMs();
  const ms = () => nowMs() - started;

  function fail(
    status: number,
    code: string,
    reason: string,
    fields: Record<string, unknown> = {},
    body: Record<string, unknown> = {},
  ) {
    edgeLog("error", scope, {
      event: "fail",
      code,
      reason,
      ...fields,
      durationMs: ms(),
    });
    return Response.json({ ok: false, ...body, error: code, reason }, {
      status,
    });
  }

  /** Thrown error -> 502 with a stable code (`prefix: detail` or upstream status). */
  function failFrom(
    error: unknown,
    fallbackCode: string,
    fields: Record<string, unknown> = {},
    body: Record<string, unknown> = {},
  ) {
    const { code, reason } = describeProcessError(error, fallbackCode);
    return fail(502, code, reason, fields, body);
  }

  return { ms, fail, failFrom };
}

export type EdgeRequest = ReturnType<typeof edgeRequest>;
