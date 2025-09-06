'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Button, Text, YStack } from 'tamagui';

import type { GetLeaderboardResponse } from '@/app/api/leaderboard/route';
import type { LeaderboardRow } from '@/types/database';

export default function LeaderboardPage(): JSX.Element {
  const router = useRouter();

  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard?limit=10')
      .then(async (res) => res.json() as Promise<GetLeaderboardResponse>)
      .then((data) => {
        setRows(data.data);
      })
      .catch((e: unknown) => {
        console.error('Error loading leaderboard:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <YStack p="$4" gap="$4">
      <Text fontSize="$5">🏆 Leaderboard</Text>
      {loading && <Text>Loading...</Text>}
      {!loading && rows?.length === 0 && <Text>No scores yet — be the first!</Text>}

      {rows?.map((r, i) => (
        <YStack key={r.id} p="$2" br={8} bg="#f5f5f5">
          <Text theme="light_white">
            {i + 1}. {r.name} — {r.time_seconds}s
          </Text>
        </YStack>
      ))}

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
