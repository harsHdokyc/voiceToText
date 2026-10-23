/**
 * Join className fragments; drops falsy values.
 * Prefer this over string templates for conditional NativeWind classes.
 */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
