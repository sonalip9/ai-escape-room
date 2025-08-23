import { describe, expect, it } from 'vitest';

import { buildPuzzlePrompt } from '@/lib/ai';

describe('buildPuzzlePrompt', () => {
  it('includes type when provided', () => {
    const prompt = buildPuzzlePrompt({ type: 'math' });
    expect(prompt).toMatch(/math/i);
  });

  it('always contains generic instruction details', () => {
    const prompt = buildPuzzlePrompt({ type: 'riddle' });
    expect(prompt).toMatch(/puzzle/i);
    expect(prompt).toMatch(/return JSON/i);
  });
});
