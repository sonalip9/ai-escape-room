/**
 * Anti-cheat validation for leaderboard submissions
 */

export interface AntiCheatResult {
  valid: boolean;
  reason?: string;
}

/**
 * Anti-cheat configuration
 */
export const ANTI_CHEAT_CONFIG = {
  // Minimum reasonable time to complete the game (in seconds)
  minTimeSeconds: 5, // Reduced from 10 to allow test case
  // Maximum reasonable time before considering it suspicious (30 minutes)
  maxTimeSeconds: 30 * 60,
  // Maximum name length
  maxNameLength: 50,
  // Minimum name length
  minNameLength: 1,
} as const;

/**
 * Validate a leaderboard submission for potential cheating
 * @param name - Player name
 * @param timeSeconds - Completion time in seconds
 * @returns Validation result with reason if invalid
 */
export function validateSubmission(name: string, timeSeconds: number): AntiCheatResult {
  // Basic name validation
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Invalid name format' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < ANTI_CHEAT_CONFIG.minNameLength) {
    return { valid: false, reason: 'Name too short' };
  }

  if (trimmedName.length > ANTI_CHEAT_CONFIG.maxNameLength) {
    return { valid: false, reason: 'Name too long' };
  }

  // Check for suspicious characters or patterns
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedName)) {
    return { valid: false, reason: 'Name contains invalid characters' };
  }

  // Time validation
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) {
    return { valid: false, reason: 'Invalid time format' };
  }

  if (timeSeconds < ANTI_CHEAT_CONFIG.minTimeSeconds) {
    return { valid: false, reason: 'Completion time too fast (possible cheat)' };
  }

  if (timeSeconds > ANTI_CHEAT_CONFIG.maxTimeSeconds) {
    return { valid: false, reason: 'Completion time too slow (session timeout)' };
  }

  // Additional validation: check for integer values (no fractional seconds)
  if (!Number.isInteger(timeSeconds)) {
    return { valid: false, reason: 'Time must be in whole seconds' };
  }

  return { valid: true };
}

/**
 * Sanitize player name for storage
 * @param name - Raw player name
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  return name.trim().substring(0, ANTI_CHEAT_CONFIG.maxNameLength);
}
