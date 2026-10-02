/**
 * Edge structured logging — same pretty [vtw] JSON shape as the app (src=edge).
 * Never log transcripts, audio bytes, auth headers, or secrets.
 */

export type EdgeLogLevel = "debug" | "info" | "warn" | "error";

const REDACT = new Set([
  "password",
  "token",
  "authorization",
  "apikey",
  "api_key",
  "transcript",
  "audio",
  "file",
  "signedurl",
  "signed_url",
]);

function sanitize(fields: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACT.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function edgeLog(
  level: EdgeLogLevel,
  scope: string,
  fields: Record<string, unknown> = {},
) {
  const body = JSON.stringify(
    {
      ts: new Date().toISOString(),
      src: "edge",
      level,
      scope,
      ...sanitize(fields),
    },
    null,
    2,
  );
  const line = `[vtw]\n${body}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
