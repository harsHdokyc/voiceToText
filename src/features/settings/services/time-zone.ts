/** Device IANA zone (e.g. `Asia/Kolkata`, `America/New_York`), or null if unavailable. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Zone to write to `profiles.timezone`, or null when nothing should change.
 * The device wins so travel updates "today" for the daily cap and due dates.
 */
export function timeZoneToSync(
  device: string | null | undefined,
  stored: string | null | undefined,
): string | null {
  const next = device?.trim();
  if (!next || next === stored) return null;
  return next;
}
