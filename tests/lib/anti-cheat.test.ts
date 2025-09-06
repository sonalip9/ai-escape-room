import { describe, expect, it } from 'vitest';

import { validateSubmission, sanitizeName, ANTI_CHEAT_CONFIG } from '@/lib/anti-cheat';

describe('Anti-cheat validation', () => {
  describe('validateSubmission', () => {
    it('accepts valid submissions', () => {
      const result = validateSubmission('Alice', 30);
      expect(result.valid).toBe(true);
    });

    it('rejects empty names', () => {
      const result = validateSubmission('', 30);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid name format'); // Empty string is falsy, so caught by first check
    });

    it('rejects whitespace-only names', () => {
      const result = validateSubmission('   ', 30);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Name too short'); // After trim, length is 0
    });

    it('rejects null/undefined names', () => {
      const result = validateSubmission(null as any, 30);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid name format');
    });

    it('rejects names that are too long', () => {
      const longName = 'a'.repeat(ANTI_CHEAT_CONFIG.maxNameLength + 1);
      const result = validateSubmission(longName, 30);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Name too long');
    });

    it('rejects names with invalid characters', () => {
      const result = validateSubmission('Alice<script>', 30);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Name contains invalid characters');
    });

    it('rejects times that are too fast', () => {
      const result = validateSubmission('Alice', ANTI_CHEAT_CONFIG.minTimeSeconds - 1);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Completion time too fast (possible cheat)');
    });

    it('rejects times that are too slow', () => {
      const result = validateSubmission('Alice', ANTI_CHEAT_CONFIG.maxTimeSeconds + 1);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Completion time too slow (session timeout)');
    });

    it('rejects invalid time formats', () => {
      const result = validateSubmission('Alice', NaN);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid time format');
    });

    it('rejects fractional times', () => {
      const result = validateSubmission('Alice', 30.5);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Time must be in whole seconds');
    });

    it('accepts boundary values', () => {
      const minTimeResult = validateSubmission('Alice', ANTI_CHEAT_CONFIG.minTimeSeconds);
      expect(minTimeResult.valid).toBe(true);

      const maxTimeResult = validateSubmission('Alice', ANTI_CHEAT_CONFIG.maxTimeSeconds);
      expect(maxTimeResult.valid).toBe(true);
    });
  });

  describe('sanitizeName', () => {
    it('trims whitespace', () => {
      expect(sanitizeName('  Alice  ')).toBe('Alice');
    });

    it('truncates long names', () => {
      const longName = 'a'.repeat(ANTI_CHEAT_CONFIG.maxNameLength + 10);
      const result = sanitizeName(longName);
      expect(result.length).toBe(ANTI_CHEAT_CONFIG.maxNameLength);
    });

    it('handles normal names', () => {
      expect(sanitizeName('Alice')).toBe('Alice');
    });
  });
});