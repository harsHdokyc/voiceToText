/**
 * Join className fragments; drops falsy values.
 * Prefer this over string templates for conditional NativeWind classes.
 */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}
