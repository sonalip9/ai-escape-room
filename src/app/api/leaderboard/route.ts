import type { NextApiRequest } from 'next';
import { NextResponse } from 'next/server';

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

export async function GET(req: NextApiRequest): Promise<NextResponse<GetLeaderboardResponse>> {
  const query = req.query as GetLeaderboardQuery;

  const limit = Number(query.limit) || 10;
  const offset = Number(query.offset) || 0;

  if (Number.isNaN(limit) || limit < 1 || limit > 100 || Number.isNaN(offset) || offset < 0) {
    return NextResponse.json({ total: 0, data: [] }, { status: 400 });
  }
  const result = await loadLeaderboard(limit, offset);
  return NextResponse.json(result);
}

export async function POST(req: NextApiRequest): Promise<NextResponse<PostLeaderboardResponse>> {
  const { name, time_seconds } = req.body as PostLeaderboardRequest;

  if (typeof time_seconds !== 'number' || !name || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid name or time_seconds' },
      { status: 400 },
    );
  }

  const ok = await addLeaderboardEntry(name, time_seconds);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
