/**
 * Text normalization helpers for puzzle matching.
 * 1. Normalizes Unicode (NFKD)
 * 2. Removes punctuation and symbols
 * 3. Collapses whitespace
 * 4. Trims and lowercases
 *
 * Designed to make answer comparison deterministic and robust.
 * @param input Raw user input or puzzle answer
 * @returns Normalized string
 */
export function normalizeText(input: string): string {
  if (!input) return '';

  // 1. Unicode normalize
  let s = input.normalize('NFKD');

  // 2. Remove punctuation and symbols (keep letters, numbers and whitespace)
  // \p{L} = any kind of letter from any language
  // \p{N} = any kind of numeric character in any script
  // keep whitespace \s
  s = s.replace(/[^\p{L}\p{N}\s]/gu, '');

  // 3. Collapse whitespace
  s = s.replace(/\s+/g, ' ');

  // 4. Trim and lowercase
  s = s.trim().toLowerCase();

  return s;
}

/**
 * Compare two answers for equality using normalization.
 * @param a First answer
 * @param b Second answer
 * @returns A flag indicating whether the answers are equal
 */
export function areAnswersEqual(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}
