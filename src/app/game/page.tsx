'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';

import type { PostPuzzleRequest, PostPuzzleResponse } from '@/app/api/puzzle/route';
import PuzzleCard from '@/components/PuzzleCard';
import Timer from '@/components/Timer';
import { supabase } from '@/lib/supabase';
import type { Puzzle } from '@/utils/puzzles';

const NUMBER_OF_PUZZLE_PER_GAME = 3;

// Game page states - New game start, play game, game over

export default function GamePage(): JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (startedAt !== null && finishedAt !== null) {
      setTimeSeconds(Math.max(1, Math.round((finishedAt - startedAt) / 1000)));
    }
  }, [startedAt, finishedAt]);

  const fetchPuzzle = useCallback(async function (): Promise<void> {
    console.debug('Fetching new puzzle...');
    const res = await fetch('/api/puzzle', {
      method: 'POST',

      body: JSON.stringify({ count: NUMBER_OF_PUZZLE_PER_GAME } as PostPuzzleRequest),
    });
    const data = (await res.json()) as PostPuzzleResponse;
    console.debug('Fetched puzzles:', data.puzzles);
    setPuzzles(data.puzzles);
  }, []);

  const startGame = useCallback(
    async function (): Promise<void> {
      console.debug('Starting new game...');
      setLoading(true);
      await fetchPuzzle();
      setIndex(1);
      setStartedAt(Date.now());
      setFinishedAt(null);
      setTimeSeconds(null);
      setLoading(false);
    },
    [fetchPuzzle],
  );

  const onSolve = useCallback(
    function (): void {
      console.debug('Puzzle solved');
      if (index < NUMBER_OF_PUZZLE_PER_GAME) {
        setIndex((i) => i + 1);
      } else {
        const end = Date.now();
        setFinishedAt(end);
      }
    },
    [index],
  );

  const submitScore = useCallback(
    async function (): Promise<void> {
      if (timeSeconds === null) return;
      // Try to insert into supabase if available
      try {
        if (supabase) {
          await supabase
            .from('leaderboard')
            .insert([{ name: name || 'Anonymous', time_seconds: timeSeconds }]);
        }
      } catch (e) {
        console.warn('Supabase insert failed', e);
      }
      router.push('/leaderboard');
    },
    [name, router, timeSeconds],
  );

  // When finished show final screen with name input
  if (finishedAt !== null) {
    return (
      <YStack p="$4" gap="$4" ai="center" jc="center" h="100vh">
        <Text fontSize="$6">🎉 You escaped!</Text>
        <Text>Your time: {timeSeconds} seconds</Text>
        <Input
          br="$6"
          placeholder="Your name (for leaderboard)"
          value={name}
          onChangeText={setName}
          minW="$20"
        />
        <XStack gap="$3">
          <Button
            onPress={() => {
              submitScore().catch((e: unknown) => {
                console.error('Error submitting the score:', e);
              });
            }}
          >
            Submit Score
          </Button>
          <Button
            onPress={() => {
              setFinishedAt(null);
              startGame().catch((e: unknown) => {
                console.error('Error starting the game:', e);
                setLoading(false);
              });
            }}
          >
            Play Again
          </Button>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack p="$4" gap="$4" ai="center" jc="center" h="100vh">
      <Text fontSize="$5">
        Escape Room
        {startedAt !== null
          ? ` - Puzzle ${index.toString()} of ${NUMBER_OF_PUZZLE_PER_GAME.toString()}`
          : ''}
      </Text>

      <Timer startedAt={startedAt} />

      {startedAt === null || puzzles.length === 0 ? (
        <Button
          disabled={loading}
          onPress={() => {
            startGame().catch((e: unknown) => {
              console.error('Error starting the game:', e);
              setLoading(false);
            });
          }}
        >
          {loading && <Spinner size="small" mr="$2" />}
          Start
        </Button>
      ) : (
        <PuzzleCard puzzle={puzzles[index - 1]} onSolve={onSolve} isLoading={loading} />
      )}

      <Button
        variant="outlined"
        onPress={() => {
          router.push('/');
        }}
      >
        Exit
      </Button>
    </YStack>
  );
}
