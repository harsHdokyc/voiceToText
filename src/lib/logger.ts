/**
 * Structured app logging — pretty JSON blocks in Metro/terminal.
 * Never pass transcripts, audio, passwords, OTP, tokens, or signed URLs.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

const REDACT_KEYS = new Set([
  'password',
  'token',
  'otp',
  'authorization',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'transcript',
  'edited_transcript',
  'audio',
  'file',
  'signedurl',
  'signed_url',
]);

export function sanitizeLogFields(fields: LogFields = {}): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACT_KEYS.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/** Pure formatter — used by logger and unit tests. Pretty-printed for terminal readability. */
export function formatLogLine(
  level: LogLevel,
  scope: string,
  fields: LogFields = {},
  now: () => string = () => new Date().toISOString(),
) {
  const body = JSON.stringify(
    {
      ts: now(),
      src: 'app',
      level,
      scope,
      ...sanitizeLogFields(fields),
    },
    null,
    2,
  );
  return `[vtw]\n${body}`;
}

function write(level: LogLevel, scope: string, fields?: LogFields) {
  const line = formatLogLine(level, scope, fields);
  // Metro / Expo terminal
  // eslint-disable-next-line no-console
  const sink = level === 'debug' ? console.log : console[level];
  sink(line);
}

export const logger = {
  debug: (scope: string, fields?: LogFields) => write('debug', scope, fields),
  info: (scope: string, fields?: LogFields) => write('info', scope, fields),
  warn: (scope: string, fields?: LogFields) => write('warn', scope, fields),
  error: (scope: string, fields?: LogFields) => write('error', scope, fields),
};
