'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';

import type { GetLeaderboardResponse } from '@/app/api/leaderboard/route';
import type { LeaderboardRow } from '@/types/database';

type SortOrder = 'time_asc' | 'time_desc' | 'name_asc' | 'name_desc';

export default function LeaderboardPage(): JSX.Element {
  const router = useRouter();

  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('time_asc');
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Cache for 30 seconds
  const CACHE_DURATION_MS = 30 * 1000;

  const fetchLeaderboard = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && now - lastFetch < CACHE_DURATION_MS && rows !== null) {
        return; // Use cached data
      }

      setLoading(true);
      try {
        const res = await fetch('/api/leaderboard?limit=50'); // Increased limit for better sorting
        const data = (await res.json()) as GetLeaderboardResponse;
        setRows(data.data);
        setLastFetch(now);
      } catch (e: unknown) {
        console.error('Error loading leaderboard:', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [CACHE_DURATION_MS, lastFetch, rows],
  );

  useEffect(() => {
    fetchLeaderboard().catch((e: unknown) => {
      console.error('Error in fetchLeaderboard useEffect:', e);
    });
  }, [fetchLeaderboard]);

  // Sorted data using useMemo for performance
  const sortedRows = useMemo(() => {
    if (!rows) return [];

    const sorted = [...rows].sort((a, b) => {
      switch (sortOrder) {
        case 'time_asc':
          return a.time_seconds - b.time_seconds;
        case 'time_desc':
          return b.time_seconds - a.time_seconds;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [rows, sortOrder]);

  const handleRefresh = (): void => {
    fetchLeaderboard(true).catch((e: unknown) => {
      console.error('Error refreshing leaderboard:', e);
    });
  };

  return (
    <YStack p="$4" gap="$4">
      <XStack ai="center" jc="space-between">
        <Text fontSize="$5">🏆 Leaderboard</Text>
        <Button size="$3" onPress={handleRefresh} disabled={loading}>
          {loading ? <Spinner /> : '🔄'}
        </Button>
      </XStack>

      {/* Sorting controls */}
      <XStack gap="$2" flexWrap="wrap">
        <Text fontSize="$4" display="flex" ai="center">
          Sort by:
        </Text>
        <Button
          size="$3"
          variant={sortOrder === 'time_asc' ? 'outlined' : undefined}
          onPress={() => {
            setSortOrder('time_asc');
          }}
        >
          Time ↑
        </Button>
        <Button
          size="$3"
          variant={sortOrder === 'time_desc' ? 'outlined' : undefined}
          onPress={() => {
            setSortOrder('time_desc');
          }}
        >
          Time ↓
        </Button>
        <Button
          size="$3"
          variant={sortOrder === 'name_asc' ? 'outlined' : undefined}
          onPress={() => {
            setSortOrder('name_asc');
          }}
        >
          Name ↑
        </Button>
        <Button
          size="$3"
          variant={sortOrder === 'name_desc' ? 'outlined' : undefined}
          onPress={() => {
            setSortOrder('name_desc');
          }}
        >
          Name ↓
        </Button>
      </XStack>

      {loading && rows === null && <Text>Loading...</Text>}
      {!loading && sortedRows.length === 0 && <Text>No scores yet — be the first!</Text>}

      {sortedRows.map((r, i) => (
        <YStack key={r.id} p="$3" br={8} bg="#f5f5f5">
          <XStack ai="center" jc="space-between">
            <Text theme="light_white" fontSize="$4">
              {sortOrder.startsWith('time') ? i + 1 : '•'} {r.name}
            </Text>
            <Text theme="light_white" fontSize="$4" fontWeight="bold">
              {r.time_seconds}s
            </Text>
          </XStack>
        </YStack>
      ))}

      {lastFetch > 0 && (
        <Text fontSize="$2" opacity={0.7}>
          Last updated: {new Date(lastFetch).toLocaleTimeString()}
        </Text>
      )}

      <Button
        onPress={() => {
          router.back();
        }}
      >
        Back
      </Button>
    </YStack>
  );
}
