// App/api/puzzle/route.ts
import { NextResponse } from 'next/server';

import { generatePuzzle } from '@/lib/ai';
import { getRandomPuzzleFromDB, saveAIPuzzle } from '@/services/puzzles';
import { fallbackPuzzles, pickRandom, type Puzzle } from '@/utils/puzzles';

export interface PostPuzzleResponse {
  puzzle: Puzzle;
}

async function aiGenerated(): Promise<Puzzle> {
  // Try AI first (may throw on missing key or generation failure)
  const puzzle = await generatePuzzle();

  // Persist non-blocking (service handles dedupe / errors)
  saveAIPuzzle(
    { question: puzzle.question, answer: puzzle.answer, type: puzzle.type },
    { nonBlocking: true },
  ).catch((error: unknown) => {
    console.warn('Background saveAIPuzzle error', error);
  });

  return puzzle;
}

async function nonAiGenerated(): Promise<Puzzle> {
  // Try DB fallback (service)
  const dbPuzzle = await getRandomPuzzleFromDB();
  if (dbPuzzle) {
    return dbPuzzle;
  }

  // Final fallback: local curated
  const [local] = pickRandom(fallbackPuzzles, 1);
  return local;
}

export async function POST(): Promise<NextResponse<PostPuzzleResponse>> {
  try {
    const puzzle =
      process.env.NEXT_PUBLIC_USE_LOCAL_PUZZLES === 'true'
        ? await nonAiGenerated()
        : await aiGenerated();

    return NextResponse.json({ puzzle });
  } catch (aiErr) {
    console.warn('AI generation error', aiErr);

    // AI failed or key missing
    const puzzle = await nonAiGenerated();
    return NextResponse.json({ puzzle });
  }
}
