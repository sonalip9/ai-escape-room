import { NextResponse } from 'next/server';

import { aiValidateAnswer } from '@/lib/ai';
import { localValidate, type Puzzle } from '@/utils/puzzles';

export interface PostValidateRequest {
  puzzle: Puzzle;
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
export async function validateAnswer(
  puzzle: Puzzle,
  userAnswer: string,
): Promise<ValidationResult> {
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
  const { puzzle, answer } = (await req.json()) as PostValidateRequest;
  const { correct } = await validateAnswer(puzzle, answer);
  return NextResponse.json({ correct });
}
