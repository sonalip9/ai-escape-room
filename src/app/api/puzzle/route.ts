import { NextResponse } from 'next/server';

import type { GeneratePuzzleOptions } from '@/lib/ai';
import { generatePuzzle } from '@/lib/ai';
import { withRateLimit } from '@/lib/rate-limit-middleware';
import { getRandomPuzzleFromDB, saveAIPuzzle } from '@/services/puzzles';
import type { PuzzleRow, PuzzleType } from '@/types/database';
import { fallbackPuzzles, getRandomPuzzleType, pickRandom } from '@/utils/puzzles';

export interface PostPuzzleRequest {
  topic?: string;
  count?: number;
  exclude_ids?: string[];
}

export type PuzzleResponse = Pick<PuzzleRow, 'id' | 'type' | 'question'>;
export interface PostPuzzleResponse {
  puzzles: PuzzleResponse[];
}

async function aiGenerated({ type, topic }: GeneratePuzzleOptions): Promise<PuzzleResponse> {
  // Try AI first (may throw on missing key or generation failure)
  const puzzle = await generatePuzzle({ type, topic });

  // Persist non-blocking (service handles dedupe / errors)
  saveAIPuzzle(puzzle, { nonBlocking: true }).catch((error: unknown) => {
    console.warn('Background saveAIPuzzle error', error);
  });

  return { id: puzzle.id, type: puzzle.type, question: puzzle.question };
}

async function nonAiGenerated(excludeIds: string[]): Promise<PuzzleResponse> {
  // Try DB fallback (service)
  const dbPuzzle = await getRandomPuzzleFromDB(excludeIds);
  if (dbPuzzle) {
    return { id: dbPuzzle.id, type: dbPuzzle.type, question: dbPuzzle.question };
  }

  // Final fallback: local curated
  const [local] = pickRandom(
    fallbackPuzzles.filter((fp) => !excludeIds.includes(fp.id)),
    1,
  );
  return { id: local.id, type: local.type, question: local.question };
}

async function generatePuzzleAPI(
  excludeIds: string[] = [],
  { type, topic }: { type?: PuzzleType | 'auto'; topic?: string } = {},
): Promise<PuzzleResponse> {
  // Determine type: if omitted or auto -> pick random on server
  if (!type || type === 'auto') {
    type = getRandomPuzzleType();
  }

  if (process.env.NEXT_PUBLIC_USE_LOCAL_PUZZLES === 'true') return nonAiGenerated(excludeIds);

  return aiGenerated({ type, topic }).catch(async (aiErr: unknown) => {
    console.warn('AI generation error', aiErr);

    // AI failed (missing key or invalid response)
    return nonAiGenerated(excludeIds);
  });
}

async function generatePuzzleHandler(req: Request): Promise<NextResponse<PostPuzzleResponse>> {
  const body = (await req.json()) as PostPuzzleRequest | undefined | null;
  const count = Math.max(1, Math.min(10, body?.count ?? 1)); // Limit count to 10 max
  const excludeIds = Array.isArray(body?.exclude_ids) ? body.exclude_ids : [];

  const puzzles: PuzzleResponse[] = [];

  for (let i = 0; i < count; i++) {
    const p = await generatePuzzleAPI(excludeIds, { topic: body?.topic });

    // Ensure returned puzzle has id
    // Add id to exclude list to avoid duplicates in same batch
    puzzles.push(p);
    excludeIds.push(p.id);
  }

  return NextResponse.json({ puzzles });
}

export const POST = withRateLimit(generatePuzzleHandler);
