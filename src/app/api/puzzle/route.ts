// App/api/puzzle/route.ts
import { NextResponse } from 'next/server';

import { generatePuzzle } from '@/lib/ai';
import { saveAIPuzzle } from '@/services/puzzles';
import type { Puzzle } from '@/utils/puzzles';

export interface PostPuzzleResponse {
  puzzle: Puzzle;
}

export async function POST(): Promise<NextResponse<PostPuzzleResponse>> {
  const puzzle = await generatePuzzle();

  // Non-blocking write — faster response; DB insertion happens in background
  saveAIPuzzle(
    { question: puzzle.question, answer: puzzle.answer, type: puzzle.type },
    { nonBlocking: true },
  ).catch((error: unknown) => {
    console.warn('Background saveAIPuzzle error', error);
  });

  return NextResponse.json({ puzzle });
}
