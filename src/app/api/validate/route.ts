import { NextResponse } from 'next/server';

import { aiValidateAnswer } from '@/lib/ai';
import { getPuzzleFromId } from '@/services/puzzles';
import { fallbackPuzzles, localValidate } from '@/utils/puzzles';

export interface PostValidateRequest {
  puzzleId: string;
  answer: string;
}

export interface PostValidateResponse {
  correct: boolean;
}

export interface ValidationResult {
  correct: boolean;
  method: 'local' | 'ai' | 'ai_unavailable';
  confidence?: number; // Optional number 0..1 returned by AI if available
  explanation?: string;
}

/**
 * Top-level async validation that first does local checks, then falls back to AI if needed.
 */
async function validateAnswer(puzzleId: string, userAnswer: string): Promise<ValidationResult> {
  const puzzle =
    (await getPuzzleFromId(puzzleId)) ?? fallbackPuzzles.find((p) => p.id === puzzleId) ?? null;

  if (puzzle === null) {
    throw new Error('Puzzle not found');
  }

  // Local quick check
  if (localValidate(puzzle, userAnswer)) {
    return { correct: true, method: 'local', confidence: 1 };
  }

  // AI fallback
  try {
    const aiResult = await aiValidateAnswer(puzzle, userAnswer);
    return { ...aiResult, method: 'ai' };
  } catch (e) {
    // LLM not configured
    return {
      correct: false,
      confidence: 0,
      explanation:
        e !== null && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
          ? e.message
          : 'Unknown error',
      method: 'ai_unavailable',
    };
  }
}

export async function POST(req: Request): Promise<NextResponse<PostValidateResponse>> {
  const { puzzleId, answer } = (await req.json()) as PostValidateRequest;
  const { correct } = await validateAnswer(puzzleId, answer);
  return NextResponse.json({ correct });
}
