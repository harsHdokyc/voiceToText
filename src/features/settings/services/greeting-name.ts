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
