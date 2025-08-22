// App/api/puzzle/route.ts
import { NextResponse } from 'next/server';

import { generatePuzzle } from '@/lib/ai';
import type { Puzzle } from '@/utils/puzzles';

export interface PostPuzzleResponse {
  puzzle: Puzzle;
}

export async function POST(): Promise<NextResponse<PostPuzzleResponse>> {
  const puzzle = await generatePuzzle();
  return NextResponse.json({ puzzle });
}
