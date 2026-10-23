/**
 * User-local time on Edge. Edge runs in UTC; users live anywhere, so every
 * "today" / "tomorrow at 5" must go through the user's IANA zone
 * (`profiles.timezone`, synced from the device). Unknown zone → UTC.
 */

export function resolveTimeZone(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw.trim() });
    return raw.trim();
  } catch {
    return "UTC";
  }
}

/** Minutes east of UTC for `timeZone` at instant `ms` (DST-aware). */
export function offsetMinutes(timeZone: string, ms: number): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  const mins = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -mins : mins;
}

function formatOffset(mins: number): string {
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** Wall-clock ISO with offset, e.g. `2026-10-23T23:59:00+05:30`. */
export function localIso(ms: number, timeZone: string): string {
  const off = offsetMinutes(timeZone, ms);
  const wall = new Date(ms + off * 60_000).toISOString().slice(0, 19);
  return `${wall}${formatOffset(off)}`;
}

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/;

/**
 * Model `due_at` → UTC ISO. Explicit offset/Z is trusted; a naive
 * date/time is the user's wall clock in `timeZone`. Anything else → null.
 */
export function parseDueAt(
  raw: string | null | undefined,
  timeZone: string,
): string | null {
  const s = raw?.trim();
  if (!s) return null;

  if (HAS_OFFSET.test(s)) {
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }

  const m = NAIVE.exec(s);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", sec = "0"] = m;
  const wallMs = Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +sec);
  const check = new Date(wallMs);
  if (check.getUTCMonth() !== +mo! - 1 || check.getUTCDate() !== +d!) {
    return null;
  }
  // Second pass corrects the guess when the instant sits across a DST change.
  let ms = wallMs - offsetMinutes(timeZone, wallMs) * 60_000;
  ms = wallMs - offsetMinutes(timeZone, ms) * 60_000;
  return new Date(ms).toISOString();
}
