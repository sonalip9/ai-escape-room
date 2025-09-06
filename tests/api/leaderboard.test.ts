import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanupExpiredEntries, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';

const addLeaderboardEntryMock = vi.fn();
const loadLeaderboardMock = vi.fn();
vi.mock('@/services/leaderboard', () => ({
  addLeaderboardEntry: addLeaderboardEntryMock,
  loadLeaderboard: loadLeaderboardMock,
}));

function mockGet(query: string): Request {
  return new Request(
    `http://localhost:3000/api/leaderboard${query ? `?${new URLSearchParams(query)}` : ''}`,
    { method: 'GET' },
  );
}

function mockPost(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/leaderboard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    // Clear rate limiter state
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
    cleanupExpiredEntries();
    vi.useRealTimers();
    
    addLeaderboardEntryMock.mockReset();
    loadLeaderboardMock.mockReset();
    vi.clearAllMocks();
  });

  it('returns 400 for invalid params', async () => {
    const { GET } = await import('@/app/api/leaderboard/route');
    const res = await GET(mockGet('limit=-1&offset=-1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ total: 0, data: [] });
  });

  it('returns leaderboard data', async () => {
    const { GET } = await import('@/app/api/leaderboard/route');
    loadLeaderboardMock.mockResolvedValue({
      total: 2,
      data: [{ id: '1', name: 'A', time_seconds: 10, created_at: '2024-01-01' }],
    });
    const res = await GET(mockGet('limit=10&offset=0'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      total: 2,
      data: [{ id: '1', name: 'A', time_seconds: 10, created_at: '2024-01-01' }],
    });
  });
});

describe('POST /api/leaderboard', () => {
  beforeEach(() => {
    // Clear rate limiter state
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
    cleanupExpiredEntries();
    vi.useRealTimers();
    
    vi.clearAllMocks();
  });

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/leaderboard/route');
    const res = await POST(mockPost({ name: '', time_seconds: 'bad' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Invalid name or time_seconds' });
  });

  it('returns 500 for insert failure', async () => {
    const { POST } = await import('@/app/api/leaderboard/route');
    addLeaderboardEntryMock.mockResolvedValue(false);
    const res = await POST(mockPost({ name: 'Bob', time_seconds: 10 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Insert failed' });
  });

  it('returns 200 for success', async () => {
    const { POST } = await import('@/app/api/leaderboard/route');
    addLeaderboardEntryMock.mockResolvedValue(true);
    const res = await POST(mockPost({ name: 'Alice', time_seconds: 9 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
