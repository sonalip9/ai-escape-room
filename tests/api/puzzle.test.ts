import type { NextRequest } from 'next/server';
import { assert, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/puzzle/route';
import { puzzleTypes, type PuzzleType } from '@/types/database';

// Mock Groq + Supabase client
vi.mock('@/lib/ai', () => ({
  generatePuzzle: vi.fn(async ({ type }: { type: PuzzleType }) => {
    return Promise.resolve({
      id: 'test-ai',
      type,
      question: 'What has keys but can’t open locks?',
      answer: 'piano',
      difficulty: 'easy',
    });
  }),
}));

vi.mock('@/services/puzzles', () => ({
  saveAIPuzzle: vi.fn(async () => Promise.resolve(false)),
  getRandomPuzzleFromDB: vi.fn((excludeIds: string[]) => {
    if (excludeIds.includes('test-db')) return null;

    return {
      id: 'test-db',
      type: 'riddle',
      question: 'What has keys but can’t open locks?',
      answer: 'piano',
      difficulty: 'easy',
    };
  }),
}));

// ---- Unit Tests (direct function calls) ----
describe('Puzzle API - unit tests', () => {
  beforeAll(() => {
    vi.stubEnv('NEXT_PUBLIC_USE_LOCAL_PUZZLES', 'false');
  });

  it('returns an AI puzzle', async () => {
    const req = new Request('http://localhost:3000/api/puzzle', {
      method: 'POST',
      body: '{}',
    });

    const res = await POST(req as unknown as NextRequest);
    const json: unknown = await res.json();

    expect(json).toHaveProperty('puzzles');
    assert(Boolean(json) && typeof json === 'object' && json !== null && 'puzzles' in json);

    const { puzzles } = json;
    expect(Array.isArray(puzzles)).toBe(true);
    assert(Array.isArray(puzzles));
    expect(puzzles).toHaveLength(1);
    assert(puzzles.length > 0);

    const [puzzle] = puzzles as unknown[];
    expect(puzzle).toHaveProperty('id');
    expect((puzzle as { id: string }).id).toBe('test-ai');
    expect(puzzle).toHaveProperty('type');
    assert(typeof puzzle === 'object' && puzzle !== null && 'type' in puzzle);
    expect(puzzleTypes).toContain(puzzle.type);
    expect(puzzle).toHaveProperty('question');
  });

  it('respects excludeIds when provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_LOCAL_PUZZLES', 'true');
    const req = new Request('http://localhost:3000/api/puzzle', {
      method: 'POST',
      body: JSON.stringify({ exclude_ids: ['test-db'] }),
    });

    const res = await POST(req as unknown as NextRequest);
    const json: unknown = await res.json();

    expect(json).toHaveProperty('puzzles');
    assert(Boolean(json) && typeof json === 'object' && json !== null && 'puzzles' in json);

    const { puzzles } = json;
    expect(Array.isArray(puzzles)).toBe(true);
    assert(Array.isArray(puzzles));
    expect(puzzles).toHaveLength(1);
    assert(puzzles.length > 0);

    const [puzzle] = puzzles as unknown[];
    expect(puzzle).toHaveProperty('id');
    expect((puzzle as { id: string }).id).not.toBe('test-db');
    expect(puzzle).toHaveProperty('question');
  });
});
