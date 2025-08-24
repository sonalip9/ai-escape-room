import { NextResponse } from 'next/server';

import { validateAnswer } from '@/lib/ai';
import type { Puzzle } from '@/utils/puzzles';

export interface PostValidateRequest {
  puzzle: Puzzle;
  answer: string;
}

export interface PostValidateResponse {
  correct: boolean;
}

export async function POST(req: Request): Promise<NextResponse<PostValidateResponse>> {
  const { puzzle, answer } = (await req.json()) as PostValidateRequest;
  const { correct } = await validateAnswer(puzzle, answer);
  return NextResponse.json({ correct });
}
