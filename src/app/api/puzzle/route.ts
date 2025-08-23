import { NextResponse } from 'next/server';

import { generatePuzzle } from '@/lib/ai';
import { getRandomPuzzleFromDB, saveAIPuzzle } from '@/services/puzzles';
import type { PuzzleType } from '@/types/database';
import type { Puzzle } from '@/utils/puzzles';
import { fallbackPuzzles, getRandomPuzzleType, pickRandom } from '@/utils/puzzles';

export interface PostPuzzleRequest {
  topic?: string;
  count?: number;
  exclude_ids?: string[];
}

export type PuzzleResponse = Omit<Puzzle, 'answers' | 'normalized_answers'>;
export interface PostPuzzleResponse {
  puzzles: PuzzleResponse[];
}

async function aiGenerated({
  type,
  topic,
}: {
  type: PuzzleType;
  topic?: string;
}): Promise<PuzzleResponse> {
  // Try AI first (may throw on missing key or generation failure)
  const puzzle = await generatePuzzle({ type, topic });

  // Persist non-blocking (service handles dedupe / errors)
  saveAIPuzzle(puzzle, { nonBlocking: true }).catch((error: unknown) => {
    console.warn('Background saveAIPuzzle error', error);
  });

  return puzzle;
}

async function nonAiGenerated(excludeIds: string[]): Promise<PuzzleResponse> {
  // Try DB fallback (service)
  const dbPuzzle = await getRandomPuzzleFromDB(excludeIds);
  if (dbPuzzle) {
    return dbPuzzle;
  }

  // Final fallback: local curated
  const [local] = pickRandom(
    fallbackPuzzles.filter((fp) => !excludeIds.includes(fp.id)),
    1,
  );
  return local;
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

export async function POST(req: Request): Promise<NextResponse<PostPuzzleResponse>> {
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
