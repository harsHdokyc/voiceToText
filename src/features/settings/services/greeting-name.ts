/** Display name for greeting; falls back to email local-part when empty. */
export function greetingName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const name = displayName?.trim();
  if (name) return name;
  const local = email?.split('@')[0]?.trim();
  return local && local.length > 0 ? local : 'there';
}

/** Prototype Settings: display name max 30. */
export const DISPLAY_NAME_MAX = 30;

/** Trim + clamp for profiles.display_name / signup metadata. */
export function normalizeDisplayName(raw: string): string {
  return raw.trim().slice(0, DISPLAY_NAME_MAX);
}
