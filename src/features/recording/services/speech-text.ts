/** Join speech segments with a single space, ignoring blank parts. */
export function joinSpeechText(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Fold one native speech result into the dictated text. Final results extend `committed`;
 * interim ones only preview. Handles Android (one final per phrase) and iOS (one growing
 * transcript) alike.
 */
export function applySpeechResult(committed: string, text: string, isFinal: boolean) {
  const display = joinSpeechText(committed, text);
  return { committed: isFinal ? display : committed, display };
}
