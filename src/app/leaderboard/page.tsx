'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Button, Text, YStack } from 'tamagui';

import { supabase } from '@/lib/supabase';
import type { LeaderboardRow } from '@/types/database';

export default function LeaderboardPage(): JSX.Element {
  const router = useRouter();

  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        if (supabase) {
          const { data } = await supabase
            .from('leaderboard')
            .select('*')
            .order('time_seconds', { ascending: true })
            .limit(10);
          if (mounted) setRows(data ?? []);
        } else {
          setRows([]);
        }
      } catch (e) {
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch((e: unknown) => {
      console.error('Error loading leaderboard:', e);
    });
    return (): void => {
      mounted = false;
    };
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
