'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import PuzzleCard from '@/components/PuzzleCard';
import Timer from '@/components/Timer';
import { supabase } from '@/lib/supabase';
import { hardcodedPuzzles } from '@/utils/puzzles';

// Game page states - New game start, play game, game over

export default function GamePage(): JSX.Element {
  const router = useRouter();
  const puzzles = useMemo(() => hardcodedPuzzles, []);
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

  function startGame(): void {
    setIndex(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setTimeSeconds(null);
  }

  function onSolve(): void {
    if (index < puzzles.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // Finished
      const end = Date.now();
      setFinishedAt(end);
    }
  }

  async function submitScore(): Promise<void> {
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
  }

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
              startGame();
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
        Escape Room — Puzzle {index + 1} / {puzzles.length}
      </Text>

      <Timer startedAt={startedAt} />

      {startedAt === null ? (
        <Button onPress={startGame}>Start</Button>
      ) : (
        <PuzzleCard puzzle={puzzles[index]} onSolve={onSolve} />
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
