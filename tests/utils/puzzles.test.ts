import { describe, expect, it } from 'vitest';

import { getRandomPuzzleType } from '@/utils/puzzles';

describe('getRandomPuzzleType', () => {
  it('always returns one of the allowed types', () => {
    const allowed = ['riddle', 'cipher', 'math'];
    for (let i = 0; i < 50; i++) {
      expect(allowed).toContain(getRandomPuzzleType());
    }
  });

  it('returns random values over multiple calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(getRandomPuzzleType());
    }
    expect(seen.size).toBeGreaterThan(1); // Not deterministic
  });
});
