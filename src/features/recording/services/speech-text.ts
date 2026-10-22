/** Join speech segments with a single space, ignoring blank parts. */
export function joinSpeechText(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}
