import { NextResponse } from 'next/server';

import { sanitizeName, validateSubmission } from '@/lib/anti-cheat';
import { recordMetric } from '@/lib/metrics';
import { withRateLimit } from '@/lib/rate-limit-middleware';
import { DB_RETRY_CONFIG, withRetry } from '@/lib/retry';
import { addLeaderboardEntry, loadLeaderboard } from '@/services/leaderboard';
import type { LeaderboardRow } from '@/types/database';

export interface PostLeaderboardRequest {
  name: string;
  time_seconds: number;
}

export interface PostLeaderboardResponse {
  success: boolean;
  error?: string;
}

export interface GetLeaderboardQuery {
  limit?: string;
  offset?: string;
}

export interface GetLeaderboardResponse {
  total: number;
  data: LeaderboardRow[];
}

async function getLeaderboardHandler(req: Request): Promise<NextResponse<GetLeaderboardResponse>> {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams) as GetLeaderboardQuery | undefined | null;

  const limit = Number(query?.limit ?? 10);
  const offset = Number(query?.offset ?? 0);

  if (Number.isNaN(limit) || limit < 1 || limit > 100 || Number.isNaN(offset) || offset < 0) {
    return NextResponse.json({ total: 0, data: [] }, { status: 400 });
  }
  const result = await loadLeaderboard(limit, offset);
  return NextResponse.json(result);
}

export const GET = withRateLimit(getLeaderboardHandler);

async function postLeaderboardHandler(
  req: Request,
): Promise<NextResponse<PostLeaderboardResponse>> {
  const startTime = Date.now();

  try {
    const { name, time_seconds } = (await req.json()) as PostLeaderboardRequest;

    // Basic validation
    if (typeof time_seconds !== 'number' || !name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid name or time_seconds' },
        { status: 400 },
      );
    }

    // Anti-cheat validation
    const validation = validateSubmission(name, time_seconds);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: `Submission rejected: ${validation.reason ?? ''}` },
        { status: 400 },
      );
    }

    // Sanitize name
    const sanitizedName = sanitizeName(name);

    // Attempt to add entry with retry logic
    const ok = await withRetry(
      async () => addLeaderboardEntry(sanitizedName, time_seconds),
      DB_RETRY_CONFIG,
    );

    // Record metrics
    const durationMs = Date.now() - startTime;
    recordMetric({
      usedAI: false,
      type: 'validation', // Reusing existing metric type
      durationMs,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leaderboard POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRateLimit(postLeaderboardHandler);
